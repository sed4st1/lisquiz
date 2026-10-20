import uuid
import json
import logging
from typing import List
import httpx
from ..config import settings
from ..models.schemas import Quiz, Question, AnswerOption, QuizCreateRequest

logger = logging.getLogger(__name__)

SYMBOLS = ["triangle", "diamond", "circle", "square"]
COLORS = ["orange", "green", "yellow", "blue"]

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
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()

    async def generate_quiz(self, req: QuizCreateRequest) -> Quiz:
        quiz_id = f"quiz_{uuid.uuid4().hex[:8]}"
        title = f"{req.subject} ({req.grade} класс) — {req.topic}"

        questions: List[Question] = []

        if self.provider == "gigachat" and settings.GIGACHAT_CREDENTIALS:
            try:
                questions = await self._generate_with_gigachat(req)
            except Exception as e:
                logger.error(f"GigaChat generation failed: {e}. Falling back to mock generator.")
                questions = self._generate_mock_questions(req)
        elif self.provider == "yandexgpt" and settings.YANDEX_GPT_API_KEY:
            try:
                questions = await self._generate_with_yandex(req)
            except Exception as e:
                logger.error(f"YandexGPT generation failed: {e}. Falling back to mock generator.")
                questions = self._generate_mock_questions(req)
        else:
            questions = self._generate_mock_questions(req)

        return Quiz(
            id=quiz_id,
            title=title,
            subject=req.subject,
            grade=req.grade,
            topic=req.topic,
            questions=questions
        )

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

    async def _generate_with_gigachat(self, req: QuizCreateRequest) -> List[Question]:
        # Интеграция с REST API GigaChat
        # Запрос токена и генерация структурированного JSON
        headers = {
            "Authorization": f"Bearer {settings.GIGACHAT_CREDENTIALS}",
            "Content-Type": "application/json"
        }
        prompt = (
            f"Создай викторину для {req.grade} класса по предмету '{req.subject}', тема '{req.topic}'. "
            f"Нужно ровно {req.question_count} вопросов с 4 вариантами ответа, индексом правильного ответа (0-3) "
            f"и кратким методическим пояснением. Формат ответа строго валидный JSON."
        )
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            resp = await client.post(
                "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
                headers=headers,
                json={
                    "model": "GigaChat",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.5
                }
            )
            resp.raise_for_status()
            data = resp.json()
            # Парсинг ответа
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            # Преобразование в Question структуры
            res = []
            for idx, q_raw in enumerate(parsed.get("questions", [])):
                opts = [
                    AnswerOption(
                        id=j,
                        text=t,
                        is_correct=(j == q_raw.get("correct_index", 0)),
                        symbol=SYMBOLS[j % 4],
                        color=COLORS[j % 4]
                    )
                    for j, t in enumerate(q_raw.get("options", []))
                ]
                res.append(Question(
                    id=idx + 1,
                    text=q_raw.get("text", f"Вопрос {idx+1}"),
                    options=opts,
                    explanation=q_raw.get("explanation", ""),
                    time_limit_sec=20,
                    topic=req.topic,
                    grade=req.grade,
                    subject=req.subject
                ))
            return res

    async def _generate_with_yandex(self, req: QuizCreateRequest) -> List[Question]:
        # Заглушка интеграции с Yandex Foundation Models API
        # Структура аналогична GigaChat
        return self._generate_mock_questions(req)

ai_service = AIService()
