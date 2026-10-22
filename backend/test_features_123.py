"""
Test Suite for Backend Features 1, 2, 3:
1. Textbook & Paragraph Curriculum Mapper (Пёрышкин, Виленкин, Мерзляк и др.)
2. Silent Anti-Cheat Audit & Tier 3 Boss-Question specs
3. Duolingo-style Isomorphic Redemption Round & Point Recovery
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.services.textbook_service import textbook_service
from app.services.adaptive_engine import adaptive_engine
from app.services.remediation_engine import remediation_engine


class TestFeatures123(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        print("\n" + "=" * 70)
        print("  ТЕСТИРОВАНИЕ ФИЧ 1, 2, 3 НА БЭКЕНДЕ (БЕЗ ЗАТРАГИВАНИЯ ФРОНТЕНДА)")
        print("=" * 70)

    # =========================================================================
    # ФИЧА 1: УМК-МАППЕР И ВЫБОРКА ПО ПАРАГРАФАМ УЧЕБНИКА
    # =========================================================================
    def test_01_textbook_catalog_and_paragraph_search(self):
        print("\n[ФИЧА 1] Каталог учебников и выборка по параграфам...")
        # 1. API: список учебников
        r = self.client.get("/api/ml2/textbooks")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertGreaterEqual(len(data["textbooks"]), 5, "В каталоге должно быть >= 5 базовых учебников РФ")
        print(f"  OK: Найдено {len(data['textbooks'])} учебников в каталоге")

        # 2. Фильтрация по физике 7 класс
        r_phys = self.client.get("/api/ml2/textbooks?subject=Физика&grade=7")
        self.assertEqual(r_phys.status_code, 200)
        phys_books = r_phys.json()["textbooks"]
        self.assertTrue(any("Пёрышкин" in b["author"] for b in phys_books))
        print("  OK: Учебник Пёрышкина 7 класс найден")

        # 3. Получение заданий по § 22 (Расчет массы и объема тела по его плотности)
        r_para = self.client.get("/api/ml2/textbooks/peryshkin_phys_7/paragraphs/22/questions?limit=3")
        self.assertEqual(r_para.status_code, 200)
        para_res = r_para.json()
        self.assertEqual(para_res["paragraph_num"], 22)
        self.assertGreaterEqual(len(para_res["questions"]), 1)
        self.assertIn("плотность", para_res["questions"][0]["text"].lower())
        print(f"  OK: Задания по §22 успешно извлечены ({len(para_res['questions'])} шт.)")

    # =========================================================================
    # ФИЧА 2: ТИХИЙ АНТИЧИТ И БЕЙДЖИ СЛОЖНОСТИ (TIER 3 🔥)
    # =========================================================================
    def test_02_silent_anti_cheat_and_tier_specs(self):
        print("\n[ФИЧА 2] Спецификации тиров сложности и тихий античит аудит...")
        # 1. Спецификация Tier 1 (Базовый)
        spec1 = adaptive_engine.get_tier_spec(1)
        self.assertEqual(spec1["time_limit_sec"], 15)
        self.assertEqual(spec1["base_points"], 500)
        self.assertFalse(spec1["is_boss"])

        # 2. Спецификация Tier 3 (Босс-вопрос 🔥)
        spec3 = adaptive_engine.get_tier_spec(3)
        self.assertEqual(spec3["time_limit_sec"], 40)
        self.assertEqual(spec3["base_points"], 1000)
        self.assertTrue(spec3["is_boss"])
        self.assertIn("🔥", spec3["badge"])
        print(f"  OK: Tier 3 параметры: {spec3['name']}, {spec3['time_limit_sec']}с, бейдж '{spec3['badge']}'")

        # 3. Тихий античит аудит (для учителя)
        audit = adaptive_engine.audit_cheating(
            student_id="suspect_pupil",
            student_name="Иванов Пётр",
            blur_count=3,
            rapid_guess_count=2,
            total_answers=5
        )
        self.assertEqual(audit["risk_level"], "HIGH")
        self.assertGreaterEqual(len(audit["flags"]), 2)
        print(f"  OK: Тихий аудит сформирован (риск: {audit['risk_level']}): {audit['flags']}")

    # =========================================================================
    # ФИЧА 3: DUOLINGO-STYLE REDEMPTION ROUND (ИЗОМОРФНЫЕ ЗАДАЧИ И ВОЗВРАТ 60%)
    # =========================================================================
    def test_03_isomorphic_redemption_round(self):
        print("\n[ФИЧА 3] Редемпшн-раунд (изоморфная задача и возврат баллов)...")
        # 1. Создание квеста работы над ошибкой по P7.DENS.CALC
        quest = remediation_engine.create_redemption_quest(
            student_id="student_ivan",
            target_skill_id="P7.DENS.CALC",
            base_points=750
        )
        self.assertTrue(quest["redemption_id"].startswith("redempt_student_ivan"))
        self.assertEqual(quest["target_skill_id"], "P7.DENS.CALC")
        self.assertEqual(quest["potential_points_recovery"], 450)  # 60% от 750
        isomorphic = quest["isomorphic_item"]
        self.assertIsNotNone(isomorphic)
        self.assertEqual(len(isomorphic["options"]), 4)
        print(f"  OK: Создан редемпшн-квест: потенциальный возврат {quest['potential_points_recovery']} очков")
        print(f"  OK: Изоморфная задача сгенерирована: {isomorphic['stem'][:65]}...")

        # 2. Проверка успешного решения: начисление +450 очков
        eval_success = remediation_engine.evaluate_redemption_answer(
            redemption_id=quest["redemption_id"],
            is_correct=True,
            potential_points=quest["potential_points_recovery"]
        )
        self.assertTrue(eval_success["is_correct"])
        self.assertEqual(eval_success["points_recovered"], 450)
        self.assertIn("+450", eval_success["message"])
        print(f"  OK: При верном решении возвращено +{eval_success['points_recovered']} очков")

        # 3. Проверка неверного решения: 0 очков возврата
        eval_fail = remediation_engine.evaluate_redemption_answer(
            redemption_id=quest["redemption_id"],
            is_correct=False,
            potential_points=quest["potential_points_recovery"]
        )
        self.assertFalse(eval_fail["is_correct"])
        self.assertEqual(eval_fail["points_recovered"], 0)
        print("  OK: При неверном решении возвращено 0 очков (без штрафа)")


if __name__ == "__main__":
    unittest.main()
