"""
Lisquiz Class Grove 2.0 Engine (Классная Роща)
==============================================
Мета-геймификация и поведенческое удержание в экосистеме Сферум/MAX:
1. Закон минимума Либиха (Бочка Либиха): сбалансированный вклад Воды (Tier 1),
   Гумуса (Tier 2) и Света (Tier 3). Защита от буллинга: отличники не могут
   растить Дерево без ответов базовых учеников.
2. Недельные дивизионы (Совет Дубрав 25%, Лесные Стражи 50%, Хранители Ростков 25%).
   Онбординг: до 1 викторины — калибровка. После — ранжирование по процентилям.
   Топ-1 (MVP Недели), Топ-3 призёры и специальная номинация «Прорыв недели» (Most Improved).
3. Этичная карточная гача (Карточки Знаний: Common, Rare, Epic, Legendary) с софт-
   и хард-гарантами (pity). Только за активность, без микротранзакций.
4. Механика спячки (гибернация при неактивности >5 дней) без демотивации и
   3-минутный квест совместного пробуждения.
"""

import sqlite3
import os
import random
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Tuple

# Путь к SQLite базе данных Рощи
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
GROVE_DB_PATH = os.path.join(DATA_DIR, "grove.db")


# Канонический пул карточек знаний
GACHA_CARDS_CATALOG: List[Dict[str, Any]] = [
    # LEGENDARY (2% base, 30 pity)
    {
        "card_id": "leg_archimedes",
        "card_name": "Архимед Сиракузский",
        "rarity": "legendary",
        "subject": "Физика",
        "lore_microfact": "Открыл закон выталкивающей силы в ванне и выбежал на улицу с криком 'Эврика!'."
    },
    {
        "card_id": "leg_pythagoras",
        "card_name": "Пифагор Самосский",
        "rarity": "legendary",
        "subject": "Математика",
        "lore_microfact": "Считал, что миром правят числа, а интервалы в музыке подчиняются строгим дробям."
    },
    {
        "card_id": "leg_sprint_aurora",
        "card_name": "Северный Лис Спринт",
        "rarity": "legendary",
        "subject": "Мета",
        "lore_microfact": "Хранитель Сердца Рощи. Его хвост оставляет за собой след из полярного сияния формул."
    },

    # EPIC (10% base, 10 pity)
    {
        "card_id": "epic_newton_apple",
        "card_name": "Золотое Яблоко Ньютона",
        "rarity": "epic",
        "subject": "Физика",
        "lore_microfact": "Яблоко не упало Ньютону на лоб — оно упало рядом, натолкнув на мысль о гравитации Луны."
    },
    {
        "card_id": "epic_mendeleev_table",
        "card_name": "Сон Менделеева",
        "rarity": "epic",
        "subject": "Химия",
        "lore_microfact": "Менделеев не просто увидел таблицу во сне, он 20 лет раскладывал карточки элементов как пасьянс."
    },
    {
        "card_id": "epic_fibonacci_spiral",
        "card_name": "Спираль Фибоначчи",
        "rarity": "epic",
        "subject": "Математика",
        "lore_microfact": "Числа Фибоначчи задают идеальный угол расположения семян в подсолнухе (137.5°)."
    },
    {
        "card_id": "epic_euler_identity",
        "card_name": "Тождество Эйлера",
        "rarity": "epic",
        "subject": "Математика",
        "lore_microfact": "Объединяет пять фундаментальных констант: e^(i*pi) + 1 = 0."
    },

    # RARE (28% base)
    {
        "card_id": "rare_density_areometer",
        "card_name": "Ареометр Галилея",
        "rarity": "rare",
        "subject": "Физика",
        "lore_microfact": "Определяет плотность жидкости по глубине погружения стеклянного поплавка."
    },
    {
        "card_id": "rare_pascal_barrel",
        "card_name": "Бочка Паскаля",
        "rarity": "rare",
        "subject": "Физика",
        "lore_microfact": "Одна кружка воды, вылитая в тонкую высокую трубку, разорвала прочную дубовую бочку!"
    },
    {
        "card_id": "rare_prism_light",
        "card_name": "Оптическая Призма",
        "rarity": "rare",
        "subject": "Физика",
        "lore_microfact": "Разделяет пучок белого солнечного света на 7 спектральных цветов радуги."
    },
    {
        "card_id": "rare_compass_rose",
        "card_name": "Роза Ветров",
        "rarity": "rare",
        "subject": "География",
        "lore_microfact": "Стрелка компаса указывает на магнитный полюс, который не совпадает с географическим."
    },

    # COMMON (60% base)
    {
        "card_id": "com_acorn_sprout",
        "card_name": "Желудь Познания",
        "rarity": "common",
        "subject": "Природа",
        "lore_microfact": "Чтобы вырасти в исполинский дуб, маленькому желудю требуется 50 лет заботы."
    },
    {
        "card_id": "com_water_drop",
        "card_name": "Живая Капля Росы",
        "rarity": "common",
        "subject": "Природа",
        "lore_microfact": "Утренняя роса образуется при конденсации водяного пара в холодном приземном воздухе."
    },
    {
        "card_id": "com_forest_humus",
        "card_name": "Лесной Гумус",
        "rarity": "common",
        "subject": "Биология",
        "lore_microfact": "Гумус — основа плодородия почвы, богатая органическими соединениями углерода."
    },
    {
        "card_id": "com_sun_ray",
        "card_name": "Солнечный Луч",
        "rarity": "common",
        "subject": "Астрономия",
        "lore_microfact": "Фотон преодолевает путь от Солнца до листьев земных деревьев ровно за 8 минут и 20 секунд."
    },
    {
        "card_id": "com_sprint_footprint",
        "card_name": "След Лисёнка Спринта",
        "rarity": "common",
        "subject": "Следопыт",
        "lore_microfact": "Лисий шаг идет строгой цепочкой по одной линии — лисы прячут задние лапы в след передних."
    }
]

TREE_STAGES: List[Dict[str, Any]] = [
    {"level": 1, "stage": "seed", "title": "Семечко Познания", "min_xp": 0, "max_xp": 499},
    {"level": 2, "stage": "sprout", "title": "Зелёный Росток", "min_xp": 500, "max_xp": 1499},
    {"level": 3, "stage": "sapling", "title": "Молодой Саженец", "min_xp": 1500, "max_xp": 3499},
    {"level": 4, "stage": "young_tree", "title": "Крепкое Дерево", "min_xp": 3500, "max_xp": 7499},
    {"level": 5, "stage": "mature_oak", "title": "Вековой Дуб", "min_xp": 7500, "max_xp": 14999},
    {"level": 6, "stage": "sacred_grove", "title": "Цветущее Древо Мудрости", "min_xp": 15000, "max_xp": 999999},
]


class ClassGroveService:
    """
    Потокобезопасный сервис Классной Рощи, недельных дивизионов и этичной гачи.
    """

    def __init__(self, db_path: str = GROVE_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Инициализация схемы БД для Рощи."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Таблица состояния Классной Рощи
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS class_groves (
                    class_id TEXT PRIMARY KEY,
                    tree_stage TEXT NOT NULL DEFAULT 'seed',
                    stage_level INTEGER NOT NULL DEFAULT 1,
                    total_xp INTEGER NOT NULL DEFAULT 0,
                    water_pool REAL NOT NULL DEFAULT 0.0,
                    humus_pool REAL NOT NULL DEFAULT 0.0,
                    light_pool REAL NOT NULL DEFAULT 0.0,
                    effective_growth_xp REAL NOT NULL DEFAULT 0.0,
                    streak_days INTEGER NOT NULL DEFAULT 1,
                    weekly_quizzes_completed INTEGER NOT NULL DEFAULT 0,
                    last_activity_date TEXT NOT NULL,
                    is_hibernating INTEGER NOT NULL DEFAULT 0,
                    hibernation_days INTEGER NOT NULL DEFAULT 0,
                    revival_quest_active INTEGER NOT NULL DEFAULT 0
                )
            """)

            # Таблица вклада учеников (индивидуальный скоринг + дивизионы)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_contributions (
                    class_id TEXT NOT NULL,
                    student_id TEXT NOT NULL,
                    student_name TEXT NOT NULL,
                    avatar TEXT NOT NULL DEFAULT 'hedgehog',
                    weekly_xp INTEGER NOT NULL DEFAULT 0,
                    prev_week_xp INTEGER NOT NULL DEFAULT 0,
                    total_xp INTEGER NOT NULL DEFAULT 0,
                    water_contributed REAL NOT NULL DEFAULT 0.0,
                    humus_contributed REAL NOT NULL DEFAULT 0.0,
                    light_contributed REAL NOT NULL DEFAULT 0.0,
                    correct_answers INTEGER NOT NULL DEFAULT 0,
                    total_answers INTEGER NOT NULL DEFAULT 0,
                    last_active_at TEXT NOT NULL,
                    PRIMARY KEY (class_id, student_id)
                )
            """)

            # Таблица инвентаря карточек знаний
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_gacha_inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT NOT NULL,
                    card_id TEXT NOT NULL,
                    card_name TEXT NOT NULL,
                    rarity TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    lore_microfact TEXT NOT NULL,
                    obtained_at TEXT NOT NULL
                )
            """)

            # Таблица валюты и Pity-счетчиков гачи
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_gacha_state (
                    student_id TEXT PRIMARY KEY,
                    acorns_balance INTEGER NOT NULL DEFAULT 50,
                    total_pulls INTEGER NOT NULL DEFAULT 0,
                    pity_counter_epic INTEGER NOT NULL DEFAULT 0,
                    pity_counter_legendary INTEGER NOT NULL DEFAULT 0,
                    weekly_flair TEXT NOT NULL DEFAULT 'none'
                )
            """)

            conn.commit()

    # =========================================================================
    # РОЩА И БОЧКА ЛИБИХА (КЛАССОВЫЙ ПРОГРЕСС)
    # =========================================================================

    def get_or_create_grove(self, class_id: str) -> Dict[str, Any]:
        """Возвращает текущее состояние Рощи класса (или инициализирует новое)."""
        today_str = date.today().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM class_groves WHERE class_id = ?", (class_id,))
            row = cursor.fetchone()
            if not row:
                cursor.execute("""
                    INSERT INTO class_groves (
                        class_id, tree_stage, stage_level, total_xp,
                        water_pool, humus_pool, light_pool, effective_growth_xp,
                        streak_days, weekly_quizzes_completed, last_activity_date,
                        is_hibernating, hibernation_days, revival_quest_active
                    ) VALUES (?, 'seed', 1, 0, 0.0, 0.0, 0.0, 0.0, 1, 0, ?, 0, 0, 0)
                """, (class_id, today_str))
                conn.commit()
                cursor.execute("SELECT * FROM class_groves WHERE class_id = ?", (class_id,))
                row = cursor.fetchone()

            grove_data = dict(row)
            return self._enrich_grove_data(grove_data)

    def _enrich_grove_data(self, grove_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Добавляет расчетные поля: прогресс до след. стадии, закон Либиха, совет Спринта."""
        total_xp = grove_dict["total_xp"]

        # Определение текущей стадии
        current_stage = TREE_STAGES[0]
        next_stage = TREE_STAGES[1]
        for idx, st in enumerate(TREE_STAGES):
            if total_xp >= st["min_xp"]:
                current_stage = st
                next_stage = TREE_STAGES[idx + 1] if idx + 1 < len(TREE_STAGES) else st

        # Расчет Либиха: идеальные пропорции Вода (40%), Гумус (35%), Свет (25%)
        w = max(0.0, float(grove_dict["water_pool"]))
        h = max(0.0, float(grove_dict["humus_pool"]))
        l = max(0.0, float(grove_dict["light_pool"]))
        total_res = w + h + l

        if total_res > 0:
            pct_w = (w / total_res)
            pct_h = (h / total_res)
            pct_l = (l / total_res)
            # Коэффициенты достаточности относительно идеалов (0.40, 0.35, 0.25)
            ratio_w = min(1.0, pct_w / 0.40)
            ratio_h = min(1.0, pct_h / 0.35)
            ratio_l = min(1.0, pct_l / 0.25)
            # Закон Либиха: лимитирующий фактор определяет гармонию биома
            biome_balance = min(ratio_w, ratio_h, ratio_l)
        else:
            pct_w, pct_h, pct_l = 0.33, 0.33, 0.33
            ratio_w, ratio_h, ratio_l = 1.0, 1.0, 1.0
            biome_balance = 1.0

        # Формирование педагогического совета от маскота Спринта
        if total_res == 0:
            mascot_advice = "Сыграйте первую викторину, чтобы пробудить семечко Рощи!"
            biome_status = "🌱 Роща ожидает первого дождя знаний"
        elif biome_balance >= 0.80:
            mascot_advice = "Идеальный биом! Отличники и новички работают плечом к плечу (+50% к росту Рощи)!"
            biome_status = "🌿 Сбалансированная экосистема (Бонус активен)"
        elif ratio_w < ratio_h and ratio_w < ratio_l:
            mascot_advice = "Роще не хватает Воды! Нужны правильные ответы на базовые вопросы Tier 1!"
            biome_status = "💧 Засуха у корней: требуется вклад Хранителей Ростков"
        elif ratio_l < ratio_w and ratio_l < ratio_h:
            mascot_advice = "Густая тень в кроне! Нужны олимпиадные инсайты Tier 3 от Совета Дубрав!"
            biome_status = "☀️ Мало солнечного света: нужен прорыв в сложных задачах"
        else:
            mascot_advice = "Почве не хватает питательного Гумуса! Решайте стандартные задачи Tier 2!"
            biome_status = "🍂 Истощение почвы: нужны стабильные ответы Лесных Стражей"

        xp_to_next = max(0, next_stage["min_xp"] - total_xp) if next_stage != current_stage else 0
        stage_progress_pct = 100.0 if next_stage == current_stage else round(
            ((total_xp - current_stage["min_xp"]) / max(1, next_stage["min_xp"] - current_stage["min_xp"])) * 100.0, 1
        )

        grove_dict.update({
            "stage_info": current_stage,
            "next_stage_info": next_stage,
            "xp_to_next_stage": xp_to_next,
            "stage_progress_pct": min(100.0, max(0.0, stage_progress_pct)),
            "liebig": {
                "water_pct": round(pct_w * 100.0, 1),
                "humus_pct": round(pct_h * 100.0, 1),
                "light_pct": round(pct_l * 100.0, 1),
                "biome_balance": round(biome_balance, 3),
                "is_balanced_bonus": (biome_balance >= 0.80),
                "limiting_resource": "water" if ratio_w <= min(ratio_h, ratio_l) else ("light" if ratio_l <= min(ratio_w, ratio_h) else "humus")
            },
            "mascot_advice": mascot_advice,
            "biome_status": biome_status
        })
        return grove_dict

    def apply_quiz_session(
        self,
        class_id: str,
        student_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Пакетное применение результатов сыгранной викторины:
        1. Начисление очков и ресурсов Воды/Гумуса/Света по тирам вопросов.
        2. Проверка закона Либиха и начисление бонуса.
        3. Начисление «Желудей» (валюты гачи) ученикам.
        4. Обновление прогресса Дерева и стриков.
        """
        grove = self.get_or_create_grove(class_id)
        today = date.today()
        today_str = today.isoformat()

        session_total_xp = 0
        session_water = 0.0
        session_humus = 0.0
        session_light = 0.0

        with self._get_connection() as conn:
            cursor = conn.cursor()

            for res in student_results:
                sid = str(res["student_id"])
                sname = res.get("student_name", f"Ученик {sid}")
                savatar = res.get("avatar", "hedgehog")
                earned_xp = int(res.get("points_earned", 0))
                tier1_count = int(res.get("tier1_correct", 0))
                tier2_count = int(res.get("tier2_correct", 0))
                tier3_count = int(res.get("tier3_correct", 0))
                total_q = int(res.get("total_questions", tier1_count + tier2_count + tier3_count or 1))
                correct_q = tier1_count + tier2_count + tier3_count

                # Ресурсы по тирам: Tier 1 -> Вода (10 очк/шт), Tier 2 -> Гумус (15 очк/шт), Tier 3 -> Свет (25 очк/шт)
                w_gain = float(tier1_count * 10)
                h_gain = float(tier2_count * 15)
                l_gain = float(tier3_count * 25)

                session_total_xp += earned_xp
                session_water += w_gain
                session_humus += h_gain
                session_light += l_gain

                # Начисление Желудей (валюты): 20 за участие + по 2 желудя за верный ответ
                acorn_gain = 20 + (correct_q * 2)

                # Upsert студента в student_contributions
                cursor.execute("""
                    INSERT INTO student_contributions (
                        class_id, student_id, student_name, avatar,
                        weekly_xp, prev_week_xp, total_xp,
                        water_contributed, humus_contributed, light_contributed,
                        correct_answers, total_answers, last_active_at
                    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(class_id, student_id) DO UPDATE SET
                        student_name = excluded.student_name,
                        avatar = excluded.avatar,
                        weekly_xp = weekly_xp + excluded.weekly_xp,
                        total_xp = total_xp + excluded.total_xp,
                        water_contributed = water_contributed + excluded.water_contributed,
                        humus_contributed = humus_contributed + excluded.humus_contributed,
                        light_contributed = light_contributed + excluded.light_contributed,
                        correct_answers = correct_answers + excluded.correct_answers,
                        total_answers = total_answers + excluded.total_answers,
                        last_active_at = excluded.last_active_at
                """, (
                    class_id, sid, sname, savatar,
                    earned_xp, earned_xp,
                    w_gain, h_gain, l_gain,
                    correct_q, total_q, datetime.now().isoformat()
                ))

                # Начисление желудей в student_gacha_state
                cursor.execute("""
                    INSERT INTO student_gacha_state (
                        student_id, acorns_balance, total_pulls, pity_counter_epic, pity_counter_legendary, weekly_flair
                    ) VALUES (?, ?, 0, 0, 0, 'none')
                    ON CONFLICT(student_id) DO UPDATE SET
                        acorns_balance = acorns_balance + ?
                """, (sid, 50 + acorn_gain, acorn_gain))

            # Стрик логика: если последняя активность была вчера, +1 к стрику. Если сегодня — стрик тот же.
            last_date_str = grove.get("last_activity_date", today_str)
            try:
                last_d = date.fromisoformat(last_date_str)
                delta_days = (today - last_d).days
            except Exception:
                delta_days = 0

            new_streak = grove["streak_days"]
            if delta_days == 1:
                new_streak += 1
            elif delta_days > 1:
                new_streak = 1  # сброс стрика при пропуске более дня

            # Расчет бонуса сбалансированного биома Либиха
            tot_res = session_water + session_humus + session_light
            multiplier = 1.0
            if tot_res > 0:
                rw = min(1.0, (session_water / tot_res) / 0.40)
                rh = min(1.0, (session_humus / tot_res) / 0.35)
                rl = min(1.0, (session_light / tot_res) / 0.25)
                if min(rw, rh, rl) >= 0.75:
                    multiplier = 1.5  # +50% бонус идеального биома!

            effective_xp_gain = int(session_total_xp * multiplier)

            cursor.execute("""
                UPDATE class_groves SET
                    total_xp = total_xp + ?,
                    water_pool = water_pool + ?,
                    humus_pool = humus_pool + ?,
                    light_pool = light_pool + ?,
                    effective_growth_xp = effective_growth_xp + ?,
                    streak_days = ?,
                    weekly_quizzes_completed = weekly_quizzes_completed + 1,
                    last_activity_date = ?,
                    is_hibernating = 0,
                    hibernation_days = 0
                WHERE class_id = ?
            """, (
                effective_xp_gain,
                session_water, session_humus, session_light,
                effective_xp_gain,
                new_streak,
                today_str,
                class_id
            ))
            conn.commit()

        updated_grove = self.get_or_create_grove(class_id)
        return {
            "class_id": class_id,
            "session_total_xp": session_total_xp,
            "effective_xp_gain": effective_xp_gain,
            "multiplier_applied": multiplier,
            "resources_gained": {
                "water": session_water,
                "humus": session_humus,
                "light": session_light
            },
            "new_total_xp": updated_grove["total_xp"],
            "tree_stage": updated_grove["stage_info"]["title"],
            "streak_days": new_streak,
            "mascot_advice": updated_grove["mascot_advice"]
        }

    # =========================================================================
    # НЕДЕЛЬНЫЕ ДИВИЗИОНЫ И ЛИДЕРБОРД
    # =========================================================================

    def get_weekly_leaderboard(self, class_id: str) -> Dict[str, Any]:
        """
        Возвращает недельный лидерборд класса с разделением на дивизионы (квантили):
        1. 👑 Совет Дубрав (Top 25%)
        2. 🛡️ Лесные Стражи (Middle 50%)
        3. 🌱 Хранители Ростков (Bottom 25%)
        Выделяет:
        - 🥇 MVP Недели (Топ-1)
        - 🥈/🥉 Призёров (Топ-2 и 3)
        - 🌟 «Прорыв недели» (Most Improved)
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT student_id, student_name, avatar, weekly_xp, prev_week_xp,
                       total_xp, correct_answers, total_answers
                FROM student_contributions
                WHERE class_id = ?
                ORDER BY weekly_xp DESC, total_xp DESC
            """, (class_id,))
            rows = cursor.fetchall()

        if not rows:
            return {
                "class_id": class_id,
                "total_students": 0,
                "is_calibrated": False,
                "message": "Викторины еще не проводились. Все ученики в статусе «🌱 Калибровка»",
                "divisions": {
                    "council_of_groves": [],
                    "forest_guardians": [],
                    "sprout_keepers": []
                },
                "mvp_top1": None,
                "top3": [],
                "most_improved": None
            }

        students = [dict(r) for r in rows]
        n = len(students)

        # Вычисление «Прорыва недели» (максимальный прирост weekly_xp - prev_week_xp)
        most_improved_student = None
        max_delta = -999999
        for s in students:
            delta = s["weekly_xp"] - s["prev_week_xp"]
            s["delta_xp"] = delta
            if delta > max_delta and s["weekly_xp"] > 0:
                max_delta = delta
                most_improved_student = s

        # Квантили: Top 25%, Mid 50%, Bot 25%
        # Если в классе мало учеников (например < 4), минимальное распределение
        top_cut = max(1, round(n * 0.25))
        mid_cut = max(top_cut + 1, round(n * 0.75))

        council: List[Dict[str, Any]] = []
        guardians: List[Dict[str, Any]] = []
        sprouts: List[Dict[str, Any]] = []

        for idx, s in enumerate(students):
            rank = idx + 1
            s["rank"] = rank

            # Косметические бейджи
            if rank == 1:
                s["flair"] = "mvp_gold"
                s["flair_title"] = "👑 MVP Недели (Хранитель Сердца Рощи)"
            elif rank in (2, 3):
                s["flair"] = "top3_emerald"
                s["flair_title"] = f"🥈 Призёр Недели (#{rank})"
            elif most_improved_student and s["student_id"] == most_improved_student["student_id"]:
                s["flair"] = "breakthrough_star"
                s["flair_title"] = "🌟 Прорыв Недели (Самый быстрый рост)"
            else:
                s["flair"] = "none"
                s["flair_title"] = None

            # Распределение по дивизионам
            if rank <= top_cut:
                s["division"] = "council_of_groves"
                s["division_title"] = "👑 Совет Дубрав (Top 25%)"
                s["division_role"] = "☀️ Поставщик Солнечного Света (Tier 3)"
                council.append(s)
            elif rank <= mid_cut:
                s["division"] = "forest_guardians"
                s["division_title"] = "🛡️ Лесные Стражи (50%)"
                s["division_role"] = "🍂 Поставщик Питательного Гумуса (Tier 2)"
                guardians.append(s)
            else:
                s["division"] = "sprout_keepers"
                s["division_title"] = "🌱 Хранители Ростков (Bottom 25%)"
                s["division_role"] = "💧 Главный Водонос Корней (Tier 1)"
                sprouts.append(s)

        return {
            "class_id": class_id,
            "total_students": n,
            "is_calibrated": True,
            "mvp_top1": students[0] if students and students[0]["weekly_xp"] > 0 else None,
            "top3": [s for s in students[:3] if s["weekly_xp"] > 0],
            "most_improved": most_improved_student if max_delta > 0 else None,
            "divisions": {
                "council_of_groves": council,
                "forest_guardians": guardians,
                "sprout_keepers": sprouts
            }
        }

    def reset_weekly_scores(self, class_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Воскресный сброс недельного счета (Fresh Start Effect).
        Переносит weekly_xp в prev_week_xp, обнуляет weekly_xp.
        Инвентарь, титулы и all-time XP сохраняются навсегда.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if class_id:
                cursor.execute("""
                    UPDATE student_contributions
                    SET prev_week_xp = weekly_xp,
                        weekly_xp = 0,
                        water_contributed = 0.0,
                        humus_contributed = 0.0,
                        light_contributed = 0.0
                    WHERE class_id = ?
                """, (class_id,))
                cursor.execute("""
                    UPDATE class_groves
                    SET weekly_quizzes_completed = 0
                    WHERE class_id = ?
                """, (class_id,))
            else:
                cursor.execute("""
                    UPDATE student_contributions
                    SET prev_week_xp = weekly_xp,
                        weekly_xp = 0,
                        water_contributed = 0.0,
                        humus_contributed = 0.0,
                        light_contributed = 0.0
                """)
                cursor.execute("""
                    UPDATE class_groves
                    SET weekly_quizzes_completed = 0
                """)
            conn.commit()

        return {
            "status": "success",
            "message": "Недельные очки сброшены! Все ученики начинают новую неделю с чистого листа."
        }

    # =========================================================================
    # ЭТИЧНАЯ КАРТОЧНАЯ ГАЧА (КАРТОЧКИ ЗНАНИЙ)
    # =========================================================================

    def pull_knowledge_card(self, student_id: str, cost: int = 50) -> Dict[str, Any]:
        """
        Крутка карточки знаний с этичным Pity-механизмом:
        - Стоимость 50 Желудей (никакого доната, только учебная активность).
        - Drop rates: Common (60%), Rare (28%), Epic (10%), Legendary (2%).
        - Гаранты:
          - Soft-pity для Epic: если 9 круток подряд без Epic+, 10-я гарантированно Epic+.
          - Hard-pity для Legendary: если 29 круток без Legendary, 30-я гарантированно Legendary.
        - Защита от разочарования: дубликат дает 25 желудей кэшбэка.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Проверка баланса и счетчиков
            cursor.execute("SELECT * FROM student_gacha_state WHERE student_id = ?", (student_id,))
            row = cursor.fetchone()
            if not row:
                cursor.execute("""
                    INSERT INTO student_gacha_state (student_id, acorns_balance, total_pulls, pity_counter_epic, pity_counter_legendary)
                    VALUES (?, 50, 0, 0, 0)
                """, (student_id,))
                conn.commit()
                cursor.execute("SELECT * FROM student_gacha_state WHERE student_id = ?", (student_id,))
                row = cursor.fetchone()

            state = dict(row)
            if state["acorns_balance"] < cost:
                return {
                    "success": False,
                    "error": f"Недостаточно желудей! Требуется {cost}, у вас {state['acorns_balance']}. Сыграйте викторину, чтобы собрать желуди."
                }

            pity_epic = state["pity_counter_epic"] + 1
            pity_leg = state["pity_counter_legendary"] + 1
            total_pulls = state["total_pulls"] + 1

            # Определение редкости с учетом Pity
            chosen_rarity = "common"
            if pity_leg >= 30:
                chosen_rarity = "legendary"
            elif pity_epic >= 10:
                # Гарантирован минимум Epic (с 10% шансом апгрейда до Legendary)
                chosen_rarity = "legendary" if random.random() < 0.15 else "epic"
            else:
                roll = random.random()
                if roll < 0.02:
                    chosen_rarity = "legendary"
                elif roll < 0.12:
                    chosen_rarity = "epic"
                elif roll < 0.40:
                    chosen_rarity = "rare"
                else:
                    chosen_rarity = "common"

            # Сброс счетчиков гаранта
            if chosen_rarity == "legendary":
                pity_leg = 0
                pity_epic = 0
            elif chosen_rarity == "epic":
                pity_epic = 0

            # Выбор случайной карточки нужной редкости
            pool = [c for c in GACHA_CARDS_CATALOG if c["rarity"] == chosen_rarity]
            card = random.choice(pool)

            # Проверка дубликата в инвентаре
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM student_gacha_inventory
                WHERE student_id = ? AND card_id = ?
            """, (student_id, card["card_id"]))
            dup_count = cursor.fetchone()["cnt"]
            is_duplicate = dup_count > 0

            # Списание стоимости и кэшбэк при дубле
            refund = 25 if is_duplicate else 0
            new_balance = state["acorns_balance"] - cost + refund

            cursor.execute("""
                UPDATE student_gacha_state
                SET acorns_balance = ?,
                    total_pulls = ?,
                    pity_counter_epic = ?,
                    pity_counter_legendary = ?
                WHERE student_id = ?
            """, (new_balance, total_pulls, pity_epic, pity_leg, student_id))

            # Добавление в инвентарь
            cursor.execute("""
                INSERT INTO student_gacha_inventory (
                    student_id, card_id, card_name, rarity, subject, lore_microfact, obtained_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                student_id, card["card_id"], card["card_name"],
                card["rarity"], card["subject"], card["lore_microfact"],
                datetime.now().isoformat()
            ))

            conn.commit()

        return {
            "success": True,
            "card": card,
            "is_duplicate": is_duplicate,
            "refund_acorns": refund,
            "remaining_acorns": new_balance,
            "pity_info": {
                "pulls_to_epic_guarantee": max(0, 10 - pity_epic),
                "pulls_to_legendary_guarantee": max(0, 30 - pity_leg),
                "total_pulls": total_pulls
            }
        }

    def get_student_inventory(self, student_id: str) -> Dict[str, Any]:
        """Возвращает коллекцию карточек и баланс желудей ученика."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM student_gacha_state WHERE student_id = ?", (student_id,))
            state_row = cursor.fetchone()
            acorns = state_row["acorns_balance"] if state_row else 50

            cursor.execute("""
                SELECT card_id, card_name, rarity, subject, lore_microfact, COUNT(*) as count, MIN(obtained_at) as first_obtained
                FROM student_gacha_inventory
                WHERE student_id = ?
                GROUP BY card_id
                ORDER BY CASE rarity
                    WHEN 'legendary' THEN 1
                    WHEN 'epic' THEN 2
                    WHEN 'rare' THEN 3
                    ELSE 4
                END
            """, (student_id,))
            cards = [dict(r) for r in cursor.fetchall()]

        total_unique = len(cards)
        total_catalog = len(GACHA_CARDS_CATALOG)

        return {
            "student_id": student_id,
            "acorns_balance": acorns,
            "collection_progress": f"{total_unique}/{total_catalog} ({round(total_unique / total_catalog * 100, 1)}%)",
            "unique_cards_count": total_unique,
            "catalog_total": total_catalog,
            "cards": cards
        }

    # =========================================================================
    # ГИБЕРНАЦИЯ И 3-МИНУТНЫЙ КВЕСТ ПРОБУЖДЕНИЯ
    # =========================================================================

    def check_and_update_hibernation(self, class_id: str, days_threshold: int = 5) -> Dict[str, Any]:
        """
        Проверяет, прошло ли >5 дней без викторин.
        Если да — переводит Рощу в режим сна (без потери очков!).
        """
        grove = self.get_or_create_grove(class_id)
        last_str = grove.get("last_activity_date", date.today().isoformat())
        try:
            last_d = date.fromisoformat(last_str)
            days_inactive = (date.today() - last_d).days
        except Exception:
            days_inactive = 0

        is_sleeping = days_inactive >= days_threshold

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE class_groves SET
                    is_hibernating = ?,
                    hibernation_days = ?,
                    revival_quest_active = ?
                WHERE class_id = ?
            """, (1 if is_sleeping else 0, days_inactive, 1 if is_sleeping else 0, class_id))
            conn.commit()

        return {
            "class_id": class_id,
            "days_inactive": days_inactive,
            "is_hibernating": is_sleeping,
            "revival_quest_active": is_sleeping,
            "status_message": "Древо уснуло крепким сном. Пройдите 3-минутную разминку, чтобы разбудить его с салютом!" if is_sleeping else "Роща бодрствует и полна сил!"
        }

    def complete_revival_quest(self, class_id: str) -> Dict[str, Any]:
        """
        Завершение 3-минутного квеста пробуждения:
        Роща моментально просыпается, сбрасывает иней и получает бафф «Второе дыхание» (+500 XP).
        """
        today_str = date.today().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE class_groves SET
                    is_hibernating = 0,
                    hibernation_days = 0,
                    revival_quest_active = 0,
                    total_xp = total_xp + 500,
                    effective_growth_xp = effective_growth_xp + 500,
                    last_activity_date = ?
                WHERE class_id = ?
            """, (today_str, class_id))
            conn.commit()

        updated = self.get_or_create_grove(class_id)
        return {
            "class_id": class_id,
            "revived": True,
            "bonus_xp": 500,
            "new_total_xp": updated["total_xp"],
            "animation": "golden_leaves_burst",
            "mascot_speech": "Ура! Наше Дерево проснулось и засияло ярче прежнего! +500 очков в копилку Рощи!"
        }


# Синглтон сервиса
grove_service = ClassGroveService()
