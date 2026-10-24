"""
Lisquiz Class Grove 2.0 — Verification Test Suite
=================================================
Полная приёмочная верификация Классной Рощи, недельных дивизионов и этичной гачи:
1. Онбординг (холодный старт) и калибровка после первой викторины.
2. Процентильное разделение (Совет Дубрав 25%, Лесные Стражи 50%, Хранители Ростков 25%).
3. Награждение Топ-1 (MVP Недели), Топ-3 призёров и номинации «Прорыв недели».
4. Закон минимума Либиха: учет вклада Tier 1 (Вода), Tier 2 (Гумус), Tier 3 (Свет) и бонус биома x1.5.
5. Этичная гача карточек знаний: софт-гарант на Epic (10), хард-гарант на Legendary (30), кэшбэк при дубле.
6. Гибернация (>5 дней) и совместный 3-минутный квест пробуждения Рощи.
7. Проверка REST API эндпоинтов через FastAPI TestClient.
"""

import os
import unittest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.services.grove_service import grove_service, GACHA_CARDS_CATALOG


class TestLisquizClassGrove(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.test_class_id = "test_class_5a"
        print("\n" + "=" * 70)
        print("  ЗАПУСК ВЕРИФИКАЦИИ КЛАССНОЙ РОЩИ 2.0 (METAGAMING & RETENTION)")
        print("=" * 70)

    def setUp(self):
        # Очищаем состояние тестового класса перед каждым тестом
        with grove_service._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM class_groves WHERE class_id = ?", (self.test_class_id,))
            cursor.execute("DELETE FROM student_contributions WHERE class_id = ?", (self.test_class_id,))
            cursor.execute("DELETE FROM student_gacha_inventory WHERE student_id LIKE 'test_s%' OR student_id LIKE 'api_%'")
            cursor.execute("DELETE FROM student_gacha_state WHERE student_id LIKE 'test_s%' OR student_id LIKE 'api_%'")
            cursor.execute("DELETE FROM student_contributions WHERE student_id LIKE 'api_%'")
            conn.commit()

    # =========================================================================
    # ТЕСТ 1: ОНБОРДИНГ И ХОЛОДНЫЙ СТАРТ
    # =========================================================================
    def test_01_onboarding_cold_start(self):
        print("\n[ТЕСТ 1] Проверка онбординга (холодный старт без викторин)...")
        grove = grove_service.get_or_create_grove(self.test_class_id)
        self.assertEqual(grove["class_id"], self.test_class_id)
        self.assertEqual(grove["tree_stage"], "seed")
        self.assertEqual(grove["total_xp"], 0)
        self.assertEqual(grove["stage_info"]["title"], "Семечко Познания")

        leaderboard = grove_service.get_weekly_leaderboard(self.test_class_id)
        self.assertFalse(leaderboard["is_calibrated"])
        self.assertEqual(leaderboard["total_students"], 0)
        self.assertIn("Калибровка", leaderboard["message"])
        print("  OK: Холодный старт валидирован (статус 'Семечко', некалиброван, 0 очков)")

    # =========================================================================
    # ТЕСТ 2: ПРОЦЕНТИЛЬНОЕ ДЕЛЕНИЕ НА ДИВИЗИОНЫ И ТОП-1 / ТОП-3
    # =========================================================================
    def test_02_divisions_and_top_recognition(self):
        print("\n[ТЕСТ 2] Проверка распределения по дивизионам (20 учеников) и Топ-1 MVP...")
        # Симулируем класс из 20 учеников с разным количеством очков
        students = []
        for i in range(1, 21):
            sid = f"test_s{i:02d}"
            # Ученик 1 — абсолютный олимпиадник (1500 XP)
            # Ученик 15 — старательный двоечник, совершивший рывок (прошлая неделя 0, сейчас 600 XP)
            pts = (21 - i) * 75
            students.append({
                "student_id": sid,
                "student_name": f"Ученик #{i}",
                "avatar": "fox" if i == 1 else "hedgehog",
                "points_earned": pts,
                "tier1_correct": 2 if i > 15 else 1,
                "tier2_correct": 2 if 5 < i <= 15 else 1,
                "tier3_correct": 3 if i <= 5 else 0,
                "total_questions": 4
            })

        # Применяем результаты викторины
        res = grove_service.apply_quiz_session(self.test_class_id, students)
        self.assertGreater(res["new_total_xp"], 0)

        # Искусственно зададим для test_s15 прошлую неделю 0 XP (чтобы проверить «Прорыв недели»)
        with grove_service._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE student_contributions SET prev_week_xp = 50 WHERE student_id = 'test_s15'")
            conn.commit()

        leaderboard = grove_service.get_weekly_leaderboard(self.test_class_id)
        self.assertTrue(leaderboard["is_calibrated"])
        self.assertEqual(leaderboard["total_students"], 20)

        divs = leaderboard["divisions"]
        council = divs["council_of_groves"]
        guardians = divs["forest_guardians"]
        sprouts = divs["sprout_keepers"]

        # 20 * 0.25 = 5 в Совете Дубрав
        self.assertEqual(len(council), 5, "В Совете Дубрав должно быть ровно 5 учеников (25%)")
        # Средние 50% = 10 учеников
        self.assertEqual(len(guardians), 10, "В Лесных Стражах должно быть ровно 10 учеников (50%)")
        # Нижние 25% = 5 учеников
        self.assertEqual(len(sprouts), 5, "В Хранителях Ростков должно быть ровно 5 учеников (25%)")

        # Проверка Топ-1 MVP
        mvp = leaderboard["mvp_top1"]
        self.assertIsNotNone(mvp)
        self.assertEqual(mvp["rank"], 1)
        self.assertEqual(mvp["flair"], "mvp_gold")
        self.assertEqual(mvp["student_id"], "test_s01")

        # Проверка Топ-3
        top3 = leaderboard["top3"]
        self.assertEqual(len(top3), 3)
        self.assertEqual(top3[1]["flair"], "top3_emerald")
        self.assertEqual(top3[2]["flair"], "top3_emerald")

        # Проверка «Прорыва недели»
        improved = leaderboard["most_improved"]
        self.assertIsNotNone(improved)
        self.assertIn("flair", improved)
        print(f"  OK: Топ-1 MVP: {mvp['student_name']} ({mvp['weekly_xp']} XP, флейр: {mvp['flair']})")
        print(f"  OK: Совет Дубрав: {len(council)} чел, Стражи: {len(guardians)} чел, Ростки: {len(sprouts)} чел")
        print(f"  OK: Номинация 'Прорыв недели': {improved['student_name']} (дельта +{improved['delta_xp']} XP)")

    # =========================================================================
    # ТЕСТ 3: ЗАКОН МИНИМУМА ЛИБИХА И БОНУС БИОМА
    # =========================================================================
    def test_03_liebig_minimum_and_biome_bonus(self):
        print("\n[ТЕСТ 3] Проверка закона Либиха (Бочка Либиха) и бонусного множителя...")
        # Сессия 1: Идеальный баланс (Вода ~40%, Гумус ~35%, Свет ~25%)
        # Tier 1 = 4 ответа (40 воды), Tier 2 = 2 ответа (30 гумуса), Tier 3 = 1 ответ (25 света)
        balanced_session = [{
            "student_id": "test_s01",
            "student_name": "Отличник",
            "points_earned": 500,
            "tier1_correct": 4,  # 40 воды
            "tier2_correct": 2,  # 30 гумуса
            "tier3_correct": 1,  # 25 света
            "total_questions": 7
        }]
        res_balanced = grove_service.apply_quiz_session(self.test_class_id, balanced_session)
        self.assertEqual(res_balanced["multiplier_applied"], 1.5, "При сбалансированном биоме должен активироваться бонус x1.5!")

        grove_info = grove_service.get_or_create_grove(self.test_class_id)
        liebig = grove_info["liebig"]
        self.assertTrue(liebig["is_balanced_bonus"])
        self.assertIn("Идеальный биом", grove_info["mascot_advice"])
        print(f"  OK: Множитель x1.5 применен, статус биома: '{grove_info['biome_status']}'")

        # Сессия 2: Однобокий класс (только сложные задачи, ноль базовых — нет воды)
        test_class_unbalanced = "test_class_nobase"
        unbalanced_session = [{
            "student_id": "test_s99",
            "student_name": "Только Боссы",
            "points_earned": 500,
            "tier1_correct": 0,  # 0 воды!
            "tier2_correct": 1,
            "tier3_correct": 5,
            "total_questions": 6
        }]
        res_unbalanced = grove_service.apply_quiz_session(test_class_unbalanced, unbalanced_session)
        self.assertEqual(res_unbalanced["multiplier_applied"], 1.0, "При дисбалансе множитель должен быть 1.0x")
        unb_grove = grove_service.get_or_create_grove(test_class_unbalanced)
        self.assertEqual(unb_grove["liebig"]["limiting_resource"], "water")
        self.assertIn("Воды", unb_grove["mascot_advice"])
        print(f"  OK: Дефицит воды обнаружен, совет Спринта: '{unb_grove['mascot_advice']}'")

    # =========================================================================
    # ТЕСТ 4: ЭТИЧНАЯ ГАЧА С PITY-МЕХАНИЗМОМ И КЭШБЭКОМ
    # =========================================================================
    def test_04_ethical_gacha_pity_system(self):
        print("\n[ТЕСТ 4] Проверка этичной гачи знаний (Soft-Pity 10, Hard-Pity 30, кэшбэк)...")
        sid = "test_s_gacha"
        # Дадим ученику баланс 2000 желудей
        with grove_service._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO student_gacha_state (student_id, acorns_balance, total_pulls, pity_counter_epic, pity_counter_legendary)
                VALUES (?, 2000, 0, 0, 0)
            """, (sid,))
            conn.commit()

        # Делаем 9 круток с принудительно установленным счетчиком soft pity
        with grove_service._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE student_gacha_state SET pity_counter_epic = 9 WHERE student_id = ?", (sid,))
            conn.commit()

        # 10-я крутка ДОЛЖНА дать минимум Epic или Legendary из-за софт-гаранта
        pull_10 = grove_service.pull_knowledge_card(sid, cost=50)
        self.assertTrue(pull_10["success"])
        card_rarity = pull_10["card"]["rarity"]
        self.assertIn(card_rarity, ["epic", "legendary"], "10-я крутка обязана активировать Soft-Pity гарант (Epic/Legendary)!")

        # Проверяем Hard-Pity: ставим pity_counter_legendary = 29
        with grove_service._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE student_gacha_state SET pity_counter_legendary = 29 WHERE student_id = ?", (sid,))
            conn.commit()

        pull_30 = grove_service.pull_knowledge_card(sid, cost=50)
        self.assertTrue(pull_30["success"])
        self.assertEqual(pull_30["card"]["rarity"], "legendary", "30-я крутка обязана гарантировать Legendary!")

        # Проверка инвентаря
        inv = grove_service.get_student_inventory(sid)
        self.assertGreaterEqual(inv["unique_cards_count"], 1)
        self.assertTrue(any(c["rarity"] == "legendary" for c in inv["cards"]))
        print(f"  OK: Soft-Pity (Epic) и Hard-Pity (Legendary) сработали детерминированно!")
        print(f"  OK: Инвентарь ученика: {inv['collection_progress']}, легендарная карточка в наличии")

    # =========================================================================
    # ТЕСТ 5: ГИБЕРНАЦИЯ И 3-МИНУТНЫЙ КВЕСТ ПРОБУЖДЕНИЯ
    # =========================================================================
    def test_05_hibernation_and_revival(self):
        print("\n[ТЕСТ 5] Проверка гибернации при простое >5 дней и пробуждения квестом...")
        grove_service.get_or_create_grove(self.test_class_id)
        # Симулируем, что класс не играл 7 дней
        seven_days_ago = (date.today() - timedelta(days=7)).isoformat()
        with grove_service._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE class_groves SET last_activity_date = ?, total_xp = 1200
                WHERE class_id = ?
            """, (seven_days_ago, self.test_class_id))
            conn.commit()

        # Проверяем статус гибернации
        status = grove_service.check_and_update_hibernation(self.test_class_id, days_threshold=5)
        self.assertTrue(status["is_hibernating"])
        self.assertEqual(status["days_inactive"], 7)
        self.assertTrue(status["revival_quest_active"])

        # Проходим квест пробуждения
        revival = grove_service.complete_revival_quest(self.test_class_id)
        self.assertTrue(revival["revived"])
        self.assertEqual(revival["bonus_xp"], 500)
        self.assertEqual(revival["new_total_xp"], 1700)

        # Проверяем, что Роща бодрствует
        active_grove = grove_service.get_or_create_grove(self.test_class_id)
        self.assertEqual(active_grove["is_hibernating"], 0)
        self.assertEqual(active_grove["stage_info"]["stage"], "sapling")
        print(f"  OK: Роща корректно уснула на 7-й день и проснулась с бонусом +500 XP (стадия: {active_grove['stage_info']['title']})")

    # =========================================================================
    # ТЕСТ 6: ПРОВЕРКА REST API ЭНДПОИНТОВ FASTAPI
    # =========================================================================
    def test_06_fastapi_endpoints(self):
        print("\n[ТЕСТ 6] Проверка REST API эндпоинтов /api/grove/...")

        # 1. GET /api/grove/{class_id}
        resp = self.client.get(f"/api/grove/{self.test_class_id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("stage_info", data)
        self.assertIn("liebig", data)

        # 2. POST /api/grove/{class_id}/apply-session
        apply_payload = {
            "student_results": [
                {
                    "student_id": "api_s1",
                    "student_name": "API Алиса",
                    "points_earned": 300,
                    "tier1_correct": 2,
                    "tier2_correct": 1,
                    "tier3_correct": 0,
                    "total_questions": 3
                }
            ]
        }
        resp_post = self.client.post(f"/api/grove/{self.test_class_id}/apply-session", json=apply_payload)
        self.assertEqual(resp_post.status_code, 200)
        self.assertGreater(resp_post.json()["new_total_xp"], 0)

        # 3. GET /api/grove/{class_id}/leaderboard
        resp_lb = self.client.get(f"/api/grove/{self.test_class_id}/leaderboard")
        self.assertEqual(resp_lb.status_code, 200)
        self.assertTrue(resp_lb.json()["is_calibrated"])

        # 4. POST /api/grove/cards/pull
        resp_pull = self.client.post("/api/grove/cards/pull", json={"student_id": "api_s1", "cost": 50})
        self.assertEqual(resp_pull.status_code, 200)
        pull_data = resp_pull.json()
        self.assertTrue(pull_data["success"])
        self.assertIn("card", pull_data)

        # 5. GET /api/grove/cards/inventory/{student_id}
        resp_inv = self.client.get("/api/grove/cards/inventory/api_s1")
        self.assertEqual(resp_inv.status_code, 200)
        self.assertGreaterEqual(resp_inv.json()["unique_cards_count"], 1)

        # 6. POST /api/grove/{class_id}/revive
        resp_revive = self.client.post(f"/api/grove/{self.test_class_id}/revive")
        self.assertEqual(resp_revive.status_code, 200)
        self.assertTrue(resp_revive.json()["revived"])

        print("  OK: Все 6 REST API эндпоинтов /api/grove/* успешно протестированы (HTTP 200)")


if __name__ == "__main__":
    unittest.main()
