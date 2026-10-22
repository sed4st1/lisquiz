import sqlite3
import random
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from ..models.schemas import Question, AnswerOption, QuizVariant

logger = logging.getLogger(__name__)

SYMBOLS = ["triangle", "diamond", "circle", "square"]
COLORS = ["red", "blue", "yellow", "green"]

DB_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DB_DIR / "question_bank.db"

class BankService:
    """
    Сервис управления банком образовательных заданий (SQLite + FTS5).
    Обеспечивает моментальную выдачу верифицированных тестов (0 мс, 0 ₽)
    и генерацию 4 античит-вариантов с перемешиванием вопросов и кнопок ответов.
    """
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Инициализация схемы таблиц и полнотекстового индекса FTS5"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    canonical_id TEXT UNIQUE,
                    subject TEXT NOT NULL,
                    grade INTEGER NOT NULL,
                    topic TEXT NOT NULL,
                    section TEXT DEFAULT '',
                    kes_code TEXT DEFAULT '',
                    question_text TEXT NOT NULL,
                    option_a TEXT NOT NULL,
                    option_b TEXT NOT NULL,
                    option_c TEXT NOT NULL,
                    option_d TEXT NOT NULL,
                    correct_key TEXT NOT NULL,  -- 'A', 'B', 'C', 'D'
                    explanation TEXT DEFAULT '',
                    difficulty TEXT DEFAULT 'medium',
                    meta_source TEXT DEFAULT 'bank',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_questions_subj_grade 
                ON questions(subject, grade)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_questions_topic 
                ON questions(topic)
            """)

            # Создание виртуальной таблицы полнотекстового поиска FTS5
            cursor.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts USING fts5(
                    question_id UNINDEXED,
                    subject,
                    topic,
                    section,
                    question_text,
                    tokenize = 'unicode61'
                )
            """)

            # Триггеры синхронизации FTS
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS trg_questions_ai AFTER INSERT ON questions BEGIN
                    INSERT INTO questions_fts(question_id, subject, topic, section, question_text)
                    VALUES (new.id, new.subject, new.topic, new.section, new.question_text);
                END;
            """)
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS trg_questions_ad AFTER DELETE ON questions BEGIN
                    DELETE FROM questions_fts WHERE question_id = old.id;
                END;
            """)
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS trg_questions_au AFTER UPDATE ON questions BEGIN
                    DELETE FROM questions_fts WHERE question_id = old.id;
                    INSERT INTO questions_fts(question_id, subject, topic, section, question_text)
                    VALUES (new.id, new.subject, new.topic, new.section, new.question_text);
                END;
            """)
            conn.commit()

    def insert_questions(self, questions: List[Dict[str, Any]]) -> int:
        """
        Пакетная вставка вопросов с пропуском дубликатов по canonical_id или тексту.
        Возвращает количество успешно добавленных вопросов.
        """
        inserted_count = 0
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for q in questions:
                canonical_id = q.get("canonical_id") or f"q_{abs(hash(q['question_text'])) % 10000000}"
                try:
                    cursor.execute("""
                        INSERT OR IGNORE INTO questions (
                            canonical_id, subject, grade, topic, section, kes_code,
                            question_text, option_a, option_b, option_c, option_d,
                            correct_key, explanation, difficulty, meta_source
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        canonical_id,
                        q.get("subject", "Общее"),
                        int(q.get("grade", 5)),
                        q.get("topic", "Общая тема"),
                        q.get("section", ""),
                        q.get("kes_code", ""),
                        q.get("question_text", "").strip(),
                        q.get("option_a", "").strip(),
                        q.get("option_b", "").strip(),
                        q.get("option_c", "").strip(),
                        q.get("option_d", "").strip(),
                        q.get("correct_key", "A").upper().strip(),
                        q.get("explanation", ""),
                        q.get("difficulty", "medium"),
                        q.get("meta_source", "manual")
                    ))
                    if cursor.rowcount > 0:
                        inserted_count += 1
                except Exception as e:
                    logger.warning("Ошибка вставки вопроса: %s", e)
            conn.commit()
        return inserted_count

    def get_questions_by_topic(
        self,
        subject: str,
        grade: int,
        topic: str,
        count: int = 5
    ) -> List[Question]:
        """
        Поиск вопросов по теме с каскадным расширением выборки.
        Возвращает список Question моделей со стандартной раскладкой опций.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Шаг 1: Полнотекстовый поиск по теме в рамках предмета и класса
            clean_topic = topic.replace('"', '').replace("'", "").strip()
            fts_query = f"{clean_topic}*" if clean_topic else "*"
            
            rows = []
            try:
                cursor.execute("""
                    SELECT q.* FROM questions q
                    JOIN questions_fts f ON q.id = f.question_id
                    WHERE questions_fts MATCH ? AND q.subject = ? AND q.grade = ?
                    LIMIT ?
                """, (fts_query, subject, grade, count * 3))
                rows = cursor.fetchall()
            except Exception:
                rows = []

            # Шаг 2: Если мало, ищем по LIKE или только по предмету и классу
            if len(rows) < count:
                cursor.execute("""
                    SELECT * FROM questions
                    WHERE subject = ? AND grade = ? AND (topic LIKE ? OR question_text LIKE ?)
                    LIMIT ?
                """, (subject, grade, f"%{clean_topic}%", f"%{clean_topic}%", count * 3))
                like_rows = cursor.fetchall()
                seen = {r["id"] for r in rows}
                for lr in like_rows:
                    if lr["id"] not in seen:
                        rows.append(lr)
                        seen.add(lr["id"])

            # Шаг 3: Если все еще недостаточно, берем любые вопросы того же предмета и класса
            if len(rows) < count:
                cursor.execute("""
                    SELECT * FROM questions
                    WHERE subject = ? AND grade = ?
                    ORDER BY RANDOM()
                    LIMIT ?
                """, (subject, grade, count * 3))
                subj_grade_rows = cursor.fetchall()
                seen = {r["id"] for r in rows}
                for sr in subj_grade_rows:
                    if sr["id"] not in seen:
                        rows.append(sr)
                        seen.add(sr["id"])

            # Шаг 4: Если для данного класса вопросов нет, берем из того же предмета смежных классов
            if len(rows) < count:
                cursor.execute("""
                    SELECT * FROM questions
                    WHERE subject = ?
                    ORDER BY RANDOM()
                    LIMIT ?
                """, (subject, count * 3))
                subj_rows = cursor.fetchall()
                seen = {r["id"] for r in rows}
                for sr in subj_rows:
                    if sr["id"] not in seen:
                        rows.append(sr)
                        seen.add(sr["id"])

        if not rows:
            return []

        # Случайная выборка нужного количества
        selected_rows = random.sample(rows, min(len(rows), count))
        
        result_questions = []
        for idx, row in enumerate(selected_rows, start=1):
            q_model = self._row_to_question(row, question_idx=idx)
            result_questions.append(q_model)

        return result_questions

    def search_questions(
        self,
        query: str,
        subject: Optional[str] = None,
        grade: Optional[int] = None,
        limit: int = 10
    ) -> List[Question]:
        """Универсальный поиск по банку заданий"""
        clean_query = query.replace('"', '').replace("'", "").strip()
        fts_query = f"{clean_query}*" if clean_query else "*"

        with self._get_connection() as conn:
            cursor = conn.cursor()
            conditions = ["questions_fts MATCH ?"]
            params = [fts_query]

            if subject:
                conditions.append("q.subject = ?")
                params.append(subject)
            if grade:
                conditions.append("q.grade = ?")
                params.append(grade)

            where_clause = " AND ".join(conditions)
            params.append(limit)

            try:
                cursor.execute(f"""
                    SELECT q.* FROM questions q
                    JOIN questions_fts f ON q.id = f.question_id
                    WHERE {where_clause}
                    LIMIT ?
                """, params)
                rows = cursor.fetchall()
            except Exception as e:
                logger.error("Search error: %s", e)
                rows = []

        return [self._row_to_question(r, idx) for idx, r in enumerate(rows, start=1)]

    def get_stats(self) -> Dict[str, Any]:
        """Статистика наполненности банка вопросов"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM questions")
            total = cursor.fetchone()[0]

            cursor.execute("""
                SELECT subject, COUNT(*) as count 
                FROM questions 
                GROUP BY subject 
                ORDER BY count DESC
            """)
            by_subject = {row["subject"]: row["count"] for row in cursor.fetchall()}

            cursor.execute("""
                SELECT grade, COUNT(*) as count 
                FROM questions 
                GROUP BY grade 
                ORDER BY grade ASC
            """)
            by_grade = {row["grade"]: row["count"] for row in cursor.fetchall()}

            cursor.execute("""
                SELECT meta_source, COUNT(*) as count 
                FROM questions 
                GROUP BY meta_source
            """)
            by_source = {row["meta_source"]: row["count"] for row in cursor.fetchall()}

        return {
            "total_questions": total,
            "by_subject": by_subject,
            "by_grade": by_grade,
            "by_source": by_source
        }

    def generate_anti_cheat_variants(
        self,
        quiz_id: str,
        canonical_questions: List[Question],
        num_variants: int = 4
    ) -> Dict[int, QuizVariant]:
        """
        ГЕНЕРАТОР АНТИЧИТ-ВАРИАНТОВ ДЛЯ КЛАССА.
        
        Выполняет двойное перемешивание для каждого варианта (1, 2, 3, 4):
        1. ПЕРЕМЕШИВАНИЕ ПОРЯДКА ВОПРОСОВ:
           Для кого-то Вопрос 1 — это Вопрос 8, для соседа — Вопрос 3.
           Ученики за соседними партами в один и тот же момент времени видят РАЗНЫЕ вопросы!
        
        2. ПЕРЕМЕШИВАНИЕ КНОПОК И ФИГУР:
           Внутри каждого вопроса 4 варианта ответа случайно перетасовываются и привязываются
           к кнопкам: Красный ▲, Синий ◆, Жёлтый ●, Зелёный ■.
           Даже добравшись до одного и того же вопроса, на одном экране правильный ответ
           будет синим ромбом, а на соседнем — зеленым квадратом!
        
        При этом каждый вопрос сохраняет canonical_id, что позволяет учителю
        после игры получить единую методическую сводку по классу.
        """
        variants: Dict[int, QuizVariant] = {}
        n_questions = len(canonical_questions)
        if n_questions == 0:
            return variants

        for v_num in range(1, num_variants + 1):
            # Детерминированный генератор случайных чисел на основе ID квиза и номера варианта
            rng = random.Random(f"{quiz_id}_anti_cheat_variant_{v_num}")

            # 1. Перемешивание порядка вопросов
            # Для варианта 1 можно оставить канонический или сделать отдельную перестановку
            question_indices = list(range(n_questions))
            rng.shuffle(question_indices)

            variant_questions: List[Question] = []
            question_order_canonical_ids: List[int] = []

            for new_pos, orig_idx in enumerate(question_indices, start=1):
                orig_q = canonical_questions[orig_idx]
                canonical_id = orig_q.canonical_id or orig_q.id
                question_order_canonical_ids.append(canonical_id)

                # 2. Перемешивание вариантов ответа внутри вопроса
                # Сохраняем текст и статус правильности каждого варианта
                raw_options = []
                for opt in orig_q.options:
                    raw_options.append({
                        "text": opt.text,
                        "is_correct": opt.is_correct
                    })
                
                # Перетасовываем 4 опции
                rng.shuffle(raw_options)

                # Назначаем стандартные 4 кнопки Lisquiz
                shuffled_answer_options = []
                for opt_idx, raw_opt in enumerate(raw_options):
                    shuffled_answer_options.append(AnswerOption(
                        id=opt_idx + 1,
                        text=raw_opt["text"],
                        is_correct=raw_opt["is_correct"],
                        symbol=SYMBOLS[opt_idx % len(SYMBOLS)],
                        color=COLORS[opt_idx % len(COLORS)]
                    ))

                # Формируем вопрос для данного варианта
                variant_q = Question(
                    id=new_pos,  # Локальный номер вопроса на экране ученика (1, 2, 3...)
                    canonical_id=canonical_id,  # Ссылка на исходный вопрос для отчёта учителя
                    text=orig_q.text,
                    options=shuffled_answer_options,
                    explanation=orig_q.explanation,
                    time_limit_sec=orig_q.time_limit_sec,
                    topic=orig_q.topic,
                    grade=orig_q.grade,
                    subject=orig_q.subject,
                    difficulty=orig_q.difficulty,
                    meta_source=orig_q.meta_source
                )
                variant_questions.append(variant_q)

            variants[v_num] = QuizVariant(
                variant_number=v_num,
                quiz_id=quiz_id,
                questions=variant_questions,
                question_order=question_order_canonical_ids
            )

        return variants

    def _row_to_question(self, row: sqlite3.Row, question_idx: int) -> Question:
        """Преобразование строки SQLite в модель Question"""
        correct_key = row["correct_key"].upper().strip()
        options_raw = [
            ("A", row["option_a"]),
            ("B", row["option_b"]),
            ("C", row["option_c"]),
            ("D", row["option_d"]),
        ]

        options = []
        for i, (key, text) in enumerate(options_raw):
            options.append(AnswerOption(
                id=i + 1,
                text=text,
                is_correct=(key == correct_key),
                symbol=SYMBOLS[i],
                color=COLORS[i]
            ))

        return Question(
            id=question_idx,
            canonical_id=row["id"],
            text=row["question_text"],
            options=options,
            explanation=row["explanation"] or "",
            time_limit_sec=20,
            topic=row["topic"],
            grade=row["grade"],
            subject=row["subject"],
            difficulty=row["difficulty"],
            meta_source=row["meta_source"]
        )

# Глобальный синглтон сервиса банка
bank_service = BankService()
