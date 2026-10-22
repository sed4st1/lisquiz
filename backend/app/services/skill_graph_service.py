import sqlite3
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import networkx as nx

logger = logging.getLogger(__name__)

DB_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DB_DIR / "pilot_skills.db"

# 8 канонических навыков пилота «Математика 6 класс -> Физика 7 класс»
PILOT_SKILLS = [
    {
        "skill_id": "M6.FRAC.MUL",
        "subject": "Математика",
        "grade": 6,
        "title": "Умножение и деление обыкновенных дробей",
        "frp_ref": "ФРП Математика 6 кл, раздел 2.3",
        "description": "Правило умножения числителей и знаменателей, деление через обратную дробь"
    },
    {
        "skill_id": "M6.PROP.SOLVE",
        "subject": "Математика",
        "grade": 6,
        "title": "Пропорция и нахождение неизвестного члена",
        "frp_ref": "ФРП Математика 6 кл, раздел 3.1",
        "description": "Основное свойство пропорции: a*d = b*c, нахождение неизвестного x"
    },
    {
        "skill_id": "M6.EQ.EXPRESS",
        "subject": "Математика",
        "grade": 6,
        "title": "Выражение неизвестной переменной из равенства/формулы",
        "frp_ref": "ФРП Математика 6 кл, раздел 4.2",
        "description": "Алгебраический перенос множителей и делителей: если a = b/c, то b = a*c, c = b/a"
    },
    {
        "skill_id": "P7.UNITS.DENS",
        "subject": "Физика",
        "grade": 7,
        "title": "Перевод единиц измерения массы, объема и плотности",
        "frp_ref": "ФРП Физика 7 кл, раздел 1.2",
        "description": "Перевод г/см³ ↔ кг/м³ (умножение/деление на 1000), см³ ↔ м³, г ↔ кг"
    },
    {
        "skill_id": "P7.DENS.DEF",
        "subject": "Физика",
        "grade": 7,
        "title": "Физический смысл плотности вещества",
        "frp_ref": "ФРП Физика 7 кл, раздел 2.1",
        "description": "Понятие плотности как массы единицы объема вещества: rho = m / V"
    },
    {
        "skill_id": "P7.DENS.CALC",
        "subject": "Физика",
        "grade": 7,
        "title": "Расчёт плотности, массы и объёма тела",
        "frp_ref": "ФРП Физика 7 кл, раздел 2.2",
        "description": "Применение формул m = rho*V, V = m/rho, rho = m/V к практическим задачам"
    },
    {
        "skill_id": "P7.ARCH.FORCE",
        "subject": "Физика",
        "grade": 7,
        "title": "Выталкивающая сила Архимеда",
        "frp_ref": "ФРП Физика 7 кл, раздел 4.1",
        "description": "Расчёт силы Архимеда F_A = rho_жидкости * g * V_погруженной_части"
    },
    {
        "skill_id": "P7.ARCH.COND",
        "subject": "Физика",
        "grade": 7,
        "title": "Условия плавания тел",
        "frp_ref": "ФРП Физика 7 кл, раздел 4.2",
        "description": "Сравнение плотности тела и плотности жидкости: плавает, тонет, всплывает"
    }
]

# Направленные ребра графа зависимостей (Prerequisite Edges)
PILOT_EDGES = [
    ("M6.FRAC.MUL", "M6.PROP.SOLVE", "confirmed"),
    ("M6.PROP.SOLVE", "M6.EQ.EXPRESS", "confirmed"),
    ("M6.EQ.EXPRESS", "P7.DENS.CALC", "confirmed"),
    ("P7.UNITS.DENS", "P7.DENS.CALC", "confirmed"),
    ("P7.DENS.DEF", "P7.DENS.CALC", "confirmed"),
    ("P7.DENS.CALC", "P7.ARCH.FORCE", "confirmed"),
    ("P7.ARCH.FORCE", "P7.ARCH.COND", "confirmed"),
    ("P7.DENS.DEF", "P7.ARCH.COND", "confirmed"),
]

# Каталог типичных когнитивных ошибок (Misconceptions)
PILOT_MISCONCEPTIONS = [
    {
        "misc_id": "MC.DENS.INV",
        "skill_id": "P7.DENS.CALC",
        "title": "Инверсия формулы плотности (V / m)",
        "description": "Ученик делит объем на массу вместо массы на объем",
        "correction_hint": "Вспомни размерность плотности: кг/м³. Килограммы (масса) делятся на метры кубические (объем)!"
    },
    {
        "misc_id": "MC.DENS.UNIT",
        "skill_id": "P7.UNITS.DENS",
        "title": "Ошибка множителя 1000 при переводе единиц",
        "description": "Забыл умножить на 1000 при переводе г/см³ в кг/м³ (или наоборот разделил)",
        "correction_hint": "1 г/см³ = 1000 кг/м³. Плотность воды 1 г/см³ или 1000 кг/м³!"
    },
    {
        "misc_id": "MC.EXPR.INV",
        "skill_id": "M6.EQ.EXPRESS",
        "title": "Ошибка выражения делителя из формулы",
        "description": "При нахождении V из rho = m/V выразил V = rho*m или V = rho/m вместо m/rho",
        "correction_hint": "Если rho = m / V, то V = m / rho. Знаменатель равен числителю, деленному на частное."
    },
    {
        "misc_id": "MC.FRAC.ADDDEN",
        "skill_id": "M6.FRAC.MUL",
        "title": "Сложение знаменателей дробей",
        "description": "При операциях с дробями просто сложил или перемножил знаменатели без учета правил",
        "correction_hint": "При делении дробь переворачивается: a/b : c/d = a/b * d/c."
    },
    {
        "misc_id": "MC.ARCH.BODYDENS",
        "skill_id": "P7.ARCH.FORCE",
        "title": "Подстановка плотности тела вместо жидкости",
        "description": "В формулу силы Архимеда подставил плотность самого тела, а не вытесненной жидкости",
        "correction_hint": "Сила Архимеда зависит от плотности ЖИДКОСТИ, в которую погружено тело, а не от материала тела!"
    },
    {
        "misc_id": "MC.ARCH.SUBM",
        "skill_id": "P7.ARCH.FORCE",
        "title": "Игнорирование объема погруженной части",
        "description": "Взял весь объем тела вместо объема части, находящейся под водой",
        "correction_hint": "В формуле Архимеда учитывается только объем ПОГРУЖЕННОЙ части тела (под водой)!"
    },
    {
        "misc_id": "MC.ARITH_OFF1",
        "skill_id": "M6.PROP.SOLVE",
        "title": "Базовая арифметическая ошибка",
        "description": "Ошибка в таблице умножения или перенос запятой",
        "correction_hint": "Проверь вычисления: аккуратно выполни умножение столбиком."
    }
]

class SkillGraphService:
    """
    Сервис Графа Навыков, Q-матрицы и классификации ошибок (EdTech ML 2.0).
    Управляет ориентированным ациклическим графом (DAG) на NetworkX и SQLite.
    """
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self.dag = self._build_networkx_graph()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Создание реляционной схемы Q-матрицы и связей"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            
            # 1. Таблица навыков (Skills)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS skills (
                    skill_id TEXT PRIMARY KEY,
                    subject TEXT NOT NULL,
                    grade INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    frp_ref TEXT DEFAULT '',
                    description TEXT DEFAULT ''
                )
            """)

            # 2. Таблица ребер графа (Skill Edges)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS skill_edges (
                    src TEXT NOT NULL,
                    dst TEXT NOT NULL,
                    status TEXT CHECK(status IN ('hypothesis','confirmed','rejected')) DEFAULT 'hypothesis',
                    reviewer TEXT DEFAULT 'curator',
                    evidence_n INTEGER DEFAULT 0,
                    PRIMARY KEY(src, dst),
                    FOREIGN KEY(src) REFERENCES skills(skill_id),
                    FOREIGN KEY(dst) REFERENCES skills(skill_id)
                )
            """)

            # 3. Каталог ошибок (Misconceptions)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS misconceptions (
                    misc_id TEXT PRIMARY KEY,
                    skill_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    correction_hint TEXT DEFAULT '',
                    FOREIGN KEY(skill_id) REFERENCES skills(skill_id)
                )
            """)

            # 4. Тестовые задания Q-матрицы (Items)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS items (
                    item_id TEXT PRIMARY KEY,
                    canonical_id TEXT UNIQUE,
                    tier INTEGER CHECK(tier IN (1, 2, 3)) DEFAULT 2,
                    stem TEXT NOT NULL,
                    correct_idx INTEGER NOT NULL,  -- 0, 1, 2, 3
                    explanation TEXT DEFAULT '',
                    origin TEXT CHECK(origin IN ('bank', 'sympy', 'llm')) DEFAULT 'sympy',
                    reviewed_by TEXT DEFAULT 'code'
                )
            """)

            # 5. Связка Задание <-> Навык (Q-Matrix entries)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS item_skills (
                    item_id TEXT NOT NULL,
                    skill_id TEXT NOT NULL,
                    role TEXT CHECK(role IN ('primary','secondary')) DEFAULT 'primary',
                    PRIMARY KEY(item_id, skill_id),
                    FOREIGN KEY(item_id) REFERENCES items(item_id),
                    FOREIGN KEY(skill_id) REFERENCES skills(skill_id)
                )
            """)

            # 6. Дистракторы с явным тегом ошибки (Distractors)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS distractors (
                    item_id TEXT NOT NULL,
                    opt_idx INTEGER NOT NULL,  -- 0..3
                    text TEXT NOT NULL,
                    misc_id TEXT,  -- NULL для верного ответа, иначе ID когнитивной ошибки
                    origin TEXT CHECK(origin IN ('code', 'llm', 'human')) DEFAULT 'code',
                    PRIMARY KEY(item_id, opt_idx),
                    FOREIGN KEY(item_id) REFERENCES items(item_id),
                    FOREIGN KEY(misc_id) REFERENCES misconceptions(misc_id)
                )
            """)

            # 7. Логи ответов для телеметрии и BKT/Rasch (Responses)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS responses (
                    resp_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_pseudo_id TEXT NOT NULL,
                    item_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    t_shown REAL NOT NULL,
                    t_enabled REAL NOT NULL,
                    t_answered_server REAL NOT NULL,
                    opt_idx INTEGER NOT NULL,
                    is_correct INTEGER NOT NULL,
                    mode TEXT CHECK(mode IN ('board', 'phone')) DEFAULT 'phone',
                    rapid_flag INTEGER DEFAULT 0,
                    FOREIGN KEY(item_id) REFERENCES items(item_id)
                )
            """)

            # Индексы
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_item_skills ON item_skills(skill_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_distractors_misc ON distractors(misc_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_responses_student ON responses(student_pseudo_id)")

            conn.commit()

        # Наполнение базовыми навыками и ребрами пилота
        self._seed_pilot_data()

    def _seed_pilot_data(self):
        """Первоначальное наполнение 8 пилотными навыками, ребрами и каталогом ошибок"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            
            # Вставка навыков
            for s in PILOT_SKILLS:
                cursor.execute("""
                    INSERT OR IGNORE INTO skills (skill_id, subject, grade, title, frp_ref, description)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (s["skill_id"], s["subject"], s["grade"], s["title"], s["frp_ref"], s["description"]))

            # Вставка ребер
            for src, dst, status in PILOT_EDGES:
                cursor.execute("""
                    INSERT OR IGNORE INTO skill_edges (src, dst, status)
                    VALUES (?, ?, ?)
                """, (src, dst, status))

            # Вставка когнитивных ошибок
            for m in PILOT_MISCONCEPTIONS:
                cursor.execute("""
                    INSERT OR IGNORE INTO misconceptions (misc_id, skill_id, title, description, correction_hint)
                    VALUES (?, ?, ?, ?, ?)
                """, (m["misc_id"], m["skill_id"], m["title"], m["description"], m["correction_hint"]))

            conn.commit()

    def _build_networkx_graph(self) -> nx.DiGraph:
        """Построение ориентированного графа и верификация ацикличности (DAG check)"""
        g = nx.DiGraph()
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT skill_id, title, subject, grade FROM skills")
            for row in cursor.fetchall():
                g.add_node(row["skill_id"], title=row["title"], subject=row["subject"], grade=row["grade"])

            cursor.execute("SELECT src, dst, status FROM skill_edges WHERE status != 'rejected'")
            for row in cursor.fetchall():
                g.add_edge(row["src"], row["dst"], status=row["status"])

        if not nx.is_directed_acyclic_graph(g):
            cycles = list(nx.simple_cycles(g))
            raise ValueError(f"Граф навыков содержит циклы! Обнаружены циклы: {cycles}")

        logger.info("Граф навыков валидирован: узлов=%d, ребер=%d (DAG проверен, циклов нет)", g.number_of_nodes(), g.number_of_edges())
        return g

    def get_prerequisite_ancestors(self, skill_id: str) -> List[str]:
        """
        Поиск всех предшествующих пререквизитов (родительских узлов) для навыка.
        Используется RemediationEngine для выявления истинной первопричины ошибки!
        """
        if skill_id not in self.dag:
            return []
        ancestors = nx.ancestors(self.dag, skill_id)
        # Сортируем по топологическому порядку от корня к целевому
        ordered = [n for n in nx.topological_sort(self.dag) if n in ancestors]
        return ordered

    def get_skill_info(self, skill_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM skills WHERE skill_id = ?", (skill_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_misconception(self, misc_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM misconceptions WHERE misc_id = ?", (misc_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def insert_item_with_distractors(
        self,
        item: Dict[str, Any],
        options: List[Dict[str, Any]],
        skill_ids: List[str]
    ) -> bool:
        """Сохранение канонического задания с привязкой к Q-матрице и тегам ошибок"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO items (item_id, canonical_id, tier, stem, correct_idx, explanation, origin)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    item["item_id"],
                    item.get("canonical_id", item["item_id"]),
                    item.get("tier", 2),
                    item["stem"],
                    item["correct_idx"],
                    item.get("explanation", ""),
                    item.get("origin", "sympy")
                ))

                for s_id in skill_ids:
                    cursor.execute("""
                        INSERT OR IGNORE INTO item_skills (item_id, skill_id, role)
                        VALUES (?, ?, 'primary')
                    """, (item["item_id"], s_id))

                for opt_idx, opt in enumerate(options):
                    cursor.execute("""
                        INSERT OR REPLACE INTO distractors (item_id, opt_idx, text, misc_id, origin)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        item["item_id"],
                        opt_idx,
                        opt["text"],
                        opt.get("misc_id"),
                        opt.get("origin", "code")
                    ))
                conn.commit()
                return True
            except Exception as e:
                logger.error("Ошибка сохранения задания %s: %s", item.get("item_id"), e)
                conn.rollback()
                return False

    def get_items_by_skill(self, skill_id: str, tier: Optional[int] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Получение заданий по ID навыка (с подгрузкой вариантов ответов и тегов ошибок)"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            query = """
                SELECT i.item_id, i.tier, i.stem, i.correct_idx, i.explanation
                FROM items i
                JOIN item_skills is_link ON i.item_id = is_link.item_id
                WHERE is_link.skill_id = ?
            """
            params: List[Any] = [skill_id]
            if tier is not None:
                query += " AND i.tier = ?"
                params.append(tier)
            query += " LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)
            items = []
            for row in cursor.fetchall():
                item = dict(row)
                item["skill_id"] = skill_id
                cursor.execute("""
                    SELECT opt_idx, text, misc_id
                    FROM distractors
                    WHERE item_id = ?
                    ORDER BY opt_idx ASC
                """, (item["item_id"],))
                item["options"] = [dict(opt) for opt in cursor.fetchall()]
                items.append(item)
            return items

    def get_item_details(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Полная карточка задания с вариантами и первичным навыком"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM items WHERE item_id = ?", (item_id,))
            row = cursor.fetchone()
            if not row:
                return None
            item = dict(row)
            cursor.execute("SELECT skill_id FROM item_skills WHERE item_id = ?", (item_id,))
            s_row = cursor.fetchone()
            item["skill_id"] = s_row["skill_id"] if s_row else None
            cursor.execute("""
                SELECT opt_idx, text, misc_id
                FROM distractors
                WHERE item_id = ?
                ORDER BY opt_idx ASC
            """, (item_id,))
            item["options"] = [dict(opt) for opt in cursor.fetchall()]
            return item

    def record_response(
        self,
        student_pseudo_id: str,
        item_id: str,
        session_id: str,
        t_shown: float,
        t_enabled: float,
        t_answered_server: float,
        opt_idx: int,
        is_correct: bool,
        mode: str = "phone",
        rapid_flag: int = 0
    ) -> int:
        """Запись лога ответа ученика в SQLite для IRT и телеметрии ван дер Линдена"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO responses (
                    student_pseudo_id, item_id, session_id,
                    t_shown, t_enabled, t_answered_server,
                    opt_idx, is_correct, mode, rapid_flag
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                student_pseudo_id, item_id, session_id,
                t_shown, t_enabled, t_answered_server,
                opt_idx, 1 if is_correct else 0, mode, rapid_flag
            ))
            conn.commit()
            return cursor.lastrowid

    def get_stats(self) -> Dict[str, Any]:
        """Статистика наполненности пилотного графа и Q-матрицы"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM skills")
            n_skills = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM skill_edges")
            n_edges = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM misconceptions")
            n_misc = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM items")
            n_items = cursor.fetchone()[0]
            cursor.execute("""
                SELECT s.skill_id, s.title, COUNT(i.item_id) as items_count
                FROM skills s
                LEFT JOIN item_skills i ON s.skill_id = i.skill_id
                GROUP BY s.skill_id
            """)
            items_per_skill = {r["skill_id"]: r["items_count"] for r in cursor.fetchall()}

        return {
            "skills_count": n_skills,
            "edges_count": n_edges,
            "misconceptions_count": n_misc,
            "items_count": n_items,
            "items_per_skill": items_per_skill,
            "is_dag": nx.is_directed_acyclic_graph(self.dag)
        }

skill_graph_service = SkillGraphService()
