import uuid
import logging
from typing import List, Optional, Tuple, Dict, Any
from ..config import settings
from ..models.schemas import Quiz, Question, AnswerOption, QuizCreateRequest, QuizVariant
from .gigachat_client import gigachat_client
from .ocr_service import ocr_service, OCRExtractionResult
from .bank_service import bank_service

logger = logging.getLogger(__name__)

SYMBOLS = ["triangle", "diamond", "circle", "square"]
COLORS = ["red", "blue", "yellow", "green"]

# Предзаготовленные демонстрационные темы из ФРП (Федеральные рабочие программы)
MOCK_TOPICS_DATABASE = {
    "дроби": [
        {
            "text": "Чему равна сумма 1/2 + 1/4?",
            "options": ["3/4", "2/6", "1/6", "2/4"],
            "correct": 0,
            "explanation": "Приводим к общему знаменателю 4: 2/4 + 1/4 = 3/4."
        },
        {
            "text": "Какая дробь называется правильной?",
            "options": [
                "Числитель меньше знаменателя",
                "Числитель равен знаменателю",
                "Числитель больше знаменателя",
                "Знаменатель равен 0"
            ],
            "correct": 0,
            "explanation": "У правильной дроби числитель строго меньше знаменателя."
        },
        {
            "text": "Сократите дробь 6/8 до несократимой:",
            "options": ["3/4", "1/2", "2/3", "4/5"],
            "correct": 0,
            "explanation": "Делим числитель и знаменатель на НОД(6, 8) = 2. Получаем 3/4."
        },
        {
            "text": "Вычтите 3/5 - 1/5:",
            "options": ["2/5", "2/0", "1/5", "4/5"],
            "correct": 0,
            "explanation": "Знаменатели одинаковые: (3 - 1) / 5 = 2/5."
        },
        {
            "text": "Чему равно произведение 2/3 * 3/4?",
            "options": ["1/2", "6/12", "5/7", "2/4"],
            "correct": 0,
            "explanation": "2/3 * 3/4 = (2 * 3) / (3 * 4) = 6/12 = 1/2."
        }
    ]
}

class AIService:
    """
    Основной сервис генерации образовательных викторин.
    Реализует Cache-First гибридный конвейер:
    1. Приоритет 1: Локальный верифицированный банк заданий (SQLite + FTS5, 0 мс, 0 ₽).
    2. Приоритет 2: GigaChat API (если в банке мало вопросов или предоставлены заметки/фото).
    3. Автоматический генератор 4 вариантов с античит-перемешиванием (порядок вопросов + кнопки).
    """
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()

    async def generate_quiz(self, req: QuizCreateRequest) -> Quiz:
        quiz_id = f"quiz_{uuid.uuid4().hex[:8]}"
        title = f"{req.subject} ({req.grade} класс) — {req.topic}"

        questions: List[Question] = []
        source = "bank"

        # 1. Cache-First: если нет пользовательских заметок, проверяем банк вопросов
        if not req.source_notes:
            try:
                bank_qs = bank_service.get_questions_by_topic(
                    subject=req.subject,
                    grade=req.grade,
                    topic=req.topic,
                    count=req.question_count
                )
                if len(bank_qs) >= req.question_count:
                    logger.info("Выдано %d вопросов из локального банка заданий (Cache-Hit: 0 мс, 0 ₽)", len(bank_qs))
                    questions = bank_qs[:req.question_count]
                    source = "bank"
            except Exception as be:
                logger.warning("Bank lookup failed: %s", be)

        # 2. Если в банке недостаточно вопросов — обращаемся к LLM
        if not questions:
            is_gigachat_configured = bool(
                settings.GIGACHAT_CREDENTIALS or (settings.GIGACHAT_CLIENT_ID and settings.GIGACHAT_CLIENT_SECRET)
            )

            if (self.provider == "gigachat" or is_gigachat_configured) and self.provider != "mock":
                try:
                    logger.info("Генерация викторины через Сбер GigaChat API по теме '%s'", req.topic)
                    questions = await self._generate_with_gigachat(req)
                    source = "gigachat"
                    # Автосохранение сгенерированных вопросов в банк для будущих мгновенных ответов
                    self._cache_questions_to_bank(questions, req)
                except Exception as e:
                    logger.error("GigaChat generation failed: %s. Falling back to bank/mock.", e)
                    questions = bank_service.get_questions_by_topic(req.subject, req.grade, req.topic, req.question_count)
                    if not questions:
                        questions = self._generate_mock_questions(req)
                    source = "fallback"
            elif self.provider == "yandexgpt" and settings.YANDEX_GPT_API_KEY:
                try:
                    questions = await self._generate_with_yandex(req)
                    source = "yandexgpt"
                except Exception as e:
                    logger.error("YandexGPT generation failed: %s. Falling back to offline topic database.", e)
                    questions = self._generate_mock_questions(req)
                    source = "fallback"
            else:
                logger.info("Генерация викторины через офлайн банк/генератор (LLM_PROVIDER=mock)")
                questions = bank_service.get_questions_by_topic(req.subject, req.grade, req.topic, req.question_count)
                if not questions:
                    questions = self._generate_mock_questions(req)
                source = "bank"

        # 3. Генерация 4 античит-вариантов (перемешивание порядка вопросов + случайные кнопки/фигуры)
        num_variants = getattr(req, "num_variants", 4) or 4
        variants = bank_service.generate_anti_cheat_variants(
            quiz_id=quiz_id,
            canonical_questions=questions,
            num_variants=num_variants
        )

        return Quiz(
            id=quiz_id,
            title=title,
            subject=req.subject,
            grade=req.grade,
            topic=req.topic,
            questions=questions,
            source=source,
            variants=variants
        )

    async def generate_quiz_from_image(
        self,
        image_bytes: bytes,
        subject: str,
        grade: int,
        topic: Optional[str] = None,
        question_count: int = 5
    ) -> Tuple[Quiz, Dict[str, Any]]:
        """
        Сквозной ML-пайплайн Vision & OCR:
        Мультимодальная обработка фото страниц учебников/конспектов/доски через GigaChat-Pro Vision.
        """
        logger.info("Запуск мультимодального Vision пайплайна для '%s' (%s класс)...", subject, grade)
        quiz_id = f"quiz_{uuid.uuid4().hex[:8]}"
        resolved_topic = topic.strip() if topic and topic.strip() else f"Материалы с фото ({subject})"
        title = f"{subject} ({grade} класс) — {resolved_topic}"

        try:
            raw_questions = await gigachat_client.generate_quiz_from_image_raw(
                image_bytes=image_bytes,
                subject=subject,
                grade=grade,
                topic=resolved_topic,
                question_count=question_count
            )
            questions = self._parse_raw_questions(raw_questions, subject, grade, resolved_topic)
        except Exception as e:
            logger.error("Vision generation failed: %s. Falling back to local OCR.", e)
            # Фолбэк на локальный OCR
            ocr_res = ocr_service.extract_text(image_bytes)
            req = QuizCreateRequest(
                subject=subject,
                grade=grade,
                topic=resolved_topic,
                question_count=question_count,
                source_notes=ocr_res.text
            )
        variants = bank_service.generate_anti_cheat_variants(
            quiz_id=quiz_id,
            canonical_questions=questions,
            num_variants=4
        )

        quiz = Quiz(
            id=quiz_id,
            title=title,
            subject=subject,
            grade=grade,
            topic=resolved_topic,
            questions=questions,
            source="ocr",
            variants=variants
        )
        return quiz, {"model": "GigaChat-Pro Vision", "status": "success"}

    def _cache_questions_to_bank(self, questions: List[Question], req: QuizCreateRequest):
        """Кэширование вопросов, сгенерированных LLM, в локальный банк"""
        try:
            records = []
            for q in questions:
                if len(q.options) != 4:
                    continue
                correct_idx = next((i for i, opt in enumerate(q.options) if opt.is_correct), 0)
                keys = ["A", "B", "C", "D"]
                records.append({
                    "canonical_id": f"gigachat_{uuid.uuid4().hex[:8]}",
                    "subject": req.subject,
                    "grade": req.grade,
                    "topic": req.topic,
                    "section": "Генерация ИИ",
                    "question_text": q.text,
                    "option_a": q.options[0].text,
                    "option_b": q.options[1].text,
                    "option_c": q.options[2].text,
                    "option_d": q.options[3].text,
                    "correct_key": keys[correct_idx],
                    "explanation": q.explanation or "",
                    "difficulty": "medium",
                    "meta_source": "gigachat_cache"
                })
            if records:
                bank_service.insert_questions(records)
                logger.info("Сохранено %d сгенерированных вопросов в банк заданий", len(records))
        except Exception as e:
            logger.warning("Не удалось кэшировать вопросы в банк: %s", e)

    def _parse_raw_questions(
        self,
        raw_questions: List[dict],
        subject: str,
        grade: int,
        topic: str
    ) -> List[Question]:
        questions: List[Question] = []
        for idx, q_data in enumerate(raw_questions):
            q_text = str(q_data.get("text", f"Вопрос {idx + 1}")).strip()
            raw_options = q_data.get("options", [])
            correct_idx = q_data.get("correct_index", 0)

            # Гарантируем ровно 4 варианта ответа
            if len(raw_options) < 4:
                while len(raw_options) < 4:
                    raw_options.append(f"Вариант {len(raw_options) + 1}")
            elif len(raw_options) > 4:
                raw_options = raw_options[:4]

            options: List[AnswerOption] = []
            for j, opt_text in enumerate(raw_options):
                options.append(
                    AnswerOption(
                        id=j,
                        text=str(opt_text).strip(),
                        is_correct=(j == correct_idx),
                        symbol=SYMBOLS[j % len(SYMBOLS)],
                        color=COLORS[j % len(COLORS)]
                    )
                )

            explanation = str(q_data.get("explanation", "")).strip()

            questions.append(
                Question(
                    id=idx + 1,
                    text=q_text,
                    options=options,
                    explanation=explanation,
                    time_limit_sec=20,
                    topic=topic,
                    grade=grade,
                    subject=subject
                )
            )
        return questions

    async def _generate_with_gigachat(self, req: QuizCreateRequest) -> List[Question]:
        raw_questions = await gigachat_client.generate_quiz_raw(
            subject=req.subject,
            grade=req.grade,
            topic=req.topic,
            question_count=req.question_count,
            source_notes=req.source_notes
        )
        return self._parse_raw_questions(raw_questions, req.subject, req.grade, req.topic)

    def _generate_mock_questions(self, req: QuizCreateRequest) -> List[Question]:
        topic_lower = req.topic.lower()
        base_items = []
        for key in MOCK_TOPICS_DATABASE:
            if key in topic_lower:
                base_items = MOCK_TOPICS_DATABASE[key]
                break

        questions: List[Question] = []
        count = min(req.question_count, 10)

        for i in range(count):
            if base_items and i < len(base_items):
                item = base_items[i]
                q_text = item["text"]
                opt_texts = item["options"]
                correct_idx = item["correct"]
                explanation = item["explanation"]
            else:
                q_text = f"Вопрос {i+1} по теме «{req.topic}» ({req.grade} класс)"
                opt_texts = [
                    f"Правильный ответ на вопрос {i+1}",
                    f"Дистрактор A (ошибочный)",
                    f"Дистрактор B (ошибочный)",
                    f"Дистрактор C (ошибочный)"
                ]
                correct_idx = 0
                explanation = f"Пояснение к теме «{req.topic}» для вопроса {i+1}."

            options = [
                AnswerOption(
                    id=j,
                    text=opt_texts[j],
                    is_correct=(j == correct_idx),
                    symbol=SYMBOLS[j % len(SYMBOLS)],
                    color=COLORS[j % len(COLORS)]
                )
                for j in range(len(opt_texts))
            ]

            questions.append(
                Question(
                    id=i + 1,
                    text=q_text,
                    options=options,
                    explanation=explanation,
                    time_limit_sec=20,
                    topic=req.topic,
                    grade=req.grade,
                    subject=req.subject
                )
            )

        return questions

    async def _generate_with_yandex(self, req: QuizCreateRequest) -> List[Question]:
        # Резервная заглушка под Yandex Foundation Models
        return self._generate_mock_questions(req)

ai_service = AIService()
