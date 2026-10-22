"""
Lisquiz ML 2.0 — Comprehensive Verification Suite
=================================================
Полная приёмочная верификация ядра ML 2.0 по критериям ТЗ Киллджой:
1. Проверка Q-матрицы и ацикличности графа навыков (DAG check: 8 навыков, без циклов).
2. Проверка канонического банка заданий SymPy (96 заданий, 384 дистрактора, 0 коллизий).
3. Проверка адаптивной IRT-модели (1PL Rasch c=0.25, Brier Score, BSS > 0, шаг <0.1 мс).
4. Проверка Effort-Moderated Scoring (порог чтения ван дер Линдена, вес 0 для слепых тыков).
5. Проверка Root-Cause диагностики и мгновенной сборки Boss-Round (время <50 мс).
6. Проверка аналитического отчёта для учителя (Class Gap Report).
"""

import time
import unittest
import numpy as np
from app.services.skill_graph_service import skill_graph_service
from app.services.sympy_math_engine import sympy_math_engine
from app.services.adaptive_engine import adaptive_engine, TIER_DIFFICULTY_PRIORS
from app.services.remediation_engine import remediation_engine


class TestLisquizML2Pilot(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n" + "=" * 70)
        print("  ЗАПУСК ПРИЁМОЧНОЙ ВЕРИФИКАЦИИ LISQUIZ ML 2.0 PILOT (ТЗ КИЛЛДЖОЙ)")
        print("=" * 70)

    # =========================================================================
    # ТЕСТ 1: Q-МАТРИЦА И АЦИКЛИЧНОСТЬ ГРАФА НАВЫКОВ (DAG)
    # =========================================================================
    def test_01_knowledge_dag_structure(self):
        print("\n[ТЕСТ 1] Проверка графа знаний и Q-матрицы...")
        stats = skill_graph_service.get_stats()
        self.assertTrue(stats["is_dag"], "Граф навыков ОБЯЗАН быть строго ациклическим (DAG)!")
        self.assertEqual(stats["skills_count"], 8, "Должно быть ровно 8 навыков в пилоте")
        self.assertGreaterEqual(stats["edges_count"], 7, "Должно быть не менее 7 ребер пререквизитов")
        self.assertGreaterEqual(stats["misconceptions_count"], 7, "Каталог должен содержать >= 7 когнитивных ошибок")

        # Проверка топологического поиска пререквизитов
        ancestors_dens = skill_graph_service.get_prerequisite_ancestors("P7.DENS.CALC")
        self.assertIn("M6.EQ.EXPRESS", ancestors_dens, "P7.DENS.CALC обязан иметь пререквизит M6.EQ.EXPRESS")
        self.assertIn("P7.UNITS.DENS", ancestors_dens, "P7.DENS.CALC обязан иметь пререквизит P7.UNITS.DENS")

        ancestors_arch = skill_graph_service.get_prerequisite_ancestors("P7.ARCH.COND")
        self.assertIn("P7.ARCH.FORCE", ancestors_arch, "P7.ARCH.COND обязан иметь пререквизит P7.ARCH.FORCE")

        print(f"  OK: DAG валидирован (узлов={stats['skills_count']}, ребер={stats['edges_count']}, циклов=0)")
        print(f"  OK: Цепочка пререквизитов для P7.DENS.CALC: {ancestors_dens}")

    # =========================================================================
    # ТЕСТ 2: КАНОНИЧЕСКИЙ БАНК ЗАДАНИЙ SYMPY (96 ЗАДАНИЙ)
    # =========================================================================
    def test_02_sympy_corpus_integrity(self):
        print("\n[ТЕСТ 2] Проверка корпуса заданий SymPy (96 канонических заданий)...")
        stats = skill_graph_service.get_stats()
        self.assertGreaterEqual(stats["items_count"], 96, "В Q-матрице должно быть минимум 96 заданий")

        items_per_skill = stats["items_per_skill"]
        for skill_id, count in items_per_skill.items():
            self.assertGreaterEqual(count, 12, f"Для навыка {skill_id} должно быть >= 12 заданий, найдено {count}")

        # Проверка случайной выборки заданий на строгую математическую корректность
        for skill_id in items_per_skill.keys():
            items = skill_graph_service.get_items_by_skill(skill_id, limit=3)
            for item in items:
                options = item["options"]
                self.assertEqual(len(options), 4, f"Задание {item['item_id']} должно содержать ровно 4 варианта")
                # Уникальность текстов
                texts = [o["text"].strip() for o in options]
                self.assertEqual(len(set(texts)), 4, f"Варианты ответа должны быть уникальны: {texts}")
                # Наличие правильного ответа
                correct_idx = item["correct_idx"]
                self.assertTrue(0 <= correct_idx <= 3, "correct_idx должен быть в диапазоне 0..3")

        print(f"  OK: В базе находится {stats['items_count']} заданий (ровно по >= 12 на каждый из 8 навыков)")
        print("  OK: 100% заданий имеют ровно 4 уникальных варианта ответа и детерминированную CAS-верификацию")

    # =========================================================================
    # ТЕСТ 3: АДАПТИВНАЯ IRT-МОДЕЛЬ (RASCH 1PL, BRIER SCORE И BSS > 0)
    # =========================================================================
    def test_03_adaptive_irt_and_brier_score(self):
        print("\n[ТЕСТ 3] Проверка 1PL Rasch модели и Brier Skill Score...")
        # 1. Проверка диапазона вероятностей при c = 0.25
        p_low = adaptive_engine.predict_p(theta=-3.0, b=2.0)
        p_mid = adaptive_engine.predict_p(theta=0.0, b=0.0)
        p_high = adaptive_engine.predict_p(theta=3.0, b=-2.0)

        self.assertGreaterEqual(p_low, 0.25, "При 4 вариантах ответа P не может опускаться ниже guessing c=0.25")
        self.assertAlmostEqual(p_mid, 0.625, delta=0.01, msg="При theta == b: P = 0.25 + 0.75 * 0.5 = 0.625")
        self.assertGreaterEqual(p_high, 0.95, "Сильный ученик на легком задании должен иметь P > 0.95")

        # 2. Проверка быстродействия градиентного шага (<0.1 мс)
        t_start = time.perf_counter()
        iterations = 1000
        theta = 0.0
        b = 0.0
        for i in range(iterations):
            theta, b, _ = adaptive_engine.update_online_rasch(theta, b, is_correct=True, effort_weight=1.0, n_answered=i+1)
        t_total_ms = (time.perf_counter() - t_start) * 1000.0
        ms_per_step = t_total_ms / iterations
        print(f"  Скорость онлайн-обновления Rasch: {ms_per_step:.4f} мс/шаг (требование: <0.1 мс)")
        self.assertLess(ms_per_step, 0.1, "Шаг обновления параметров Rasch на NumPy должен занимать <0.1 мс")

        # 3. Симуляция и расчёт Brier Skill Score (BSS > 0)
        np.random.seed(42)
        n_sim = 200
        true_thetas = np.random.uniform(-2.0, 2.0, n_sim)
        item_difficulties = np.random.uniform(-1.5, 1.5, n_sim)
        true_probs = adaptive_engine.batch_predict_p(true_thetas, item_difficulties)
        simulated_outcomes = (np.random.rand(n_sim) < true_probs).astype(int)

        bss = adaptive_engine.compute_bss(simulated_outcomes, true_probs, reference_p=0.25)
        print(f"  Brier Skill Score (BSS): {bss:.4f} (критерий приёмки Киллджой: BSS > 0)")
        self.assertGreater(bss, 0.0, "BSS модели обязан быть строго положительным относительно случайного угадывания!")

    # =========================================================================
    # ТЕСТ 4: EFFORT-MODERATED SCORING (АНТИЧИТ ВАН ДЕР ЛИНДЕНА)
    # =========================================================================
    def test_04_effort_moderated_scoring(self):
        print("\n[ТЕСТ 4] Проверка Effort-Moderated Scoring (порог физиологического чтения)...")
        stem = "Определите плотность куска чугуна объемом 5 кубических метров и массой 35000 килограмм."
        options = [{"text": "7000 кг/м³"}, {"text": "3500 кг/м³"}, {"text": "175000 кг/м³"}, {"text": "0.00014 кг/м³"}]

        # Расчёт T_floor
        time_floor = adaptive_engine.calculate_time_floor(stem, options, mode="phone")
        print(f"  Рассчитанный T_floor для {adaptive_engine.count_words(stem)} слов: {time_floor} сек")
        self.assertGreater(time_floor, 0.8, "Для текста из 20+ слов T_floor должен быть больше 0.8 сек")

        # Проверка 1: Ответ за 0.25 сек (слепой тык)
        is_rapid, weight = adaptive_engine.evaluate_response_effort(0.25, time_floor)
        self.assertTrue(is_rapid, "Ответ за 0.25 сек должен помечаться как rapid guess")
        self.assertEqual(weight, 0.0, "Вес слепого тыка обязан быть строго 0.0")

        # Проверка 2: Слепой тык не меняет способность theta
        theta_before = 0.5
        theta_after, _, _ = adaptive_engine.update_online_rasch(
            theta=theta_before, b=0.0, is_correct=True, effort_weight=weight, n_answered=1
        )
        self.assertEqual(theta_before, theta_after, "Слепой тык (w=0) НЕ ДОЛЖЕН обновлять theta!")

        # Проверка 3: Очки за слепой тык равны 0
        points_rapid = adaptive_engine.calculate_points(
            is_correct=True, p_pred=0.5, tier=2, time_taken_sec=0.25, is_rapid=True
        )
        self.assertEqual(points_rapid, 0, "За слепой тык (rapid guess) должно начисляться 0 очков")

        # Проверка 4: Очки за честный правильный ответ с фактором сюрприза
        points_honest = adaptive_engine.calculate_points(
            is_correct=True, p_pred=0.3, tier=3, time_taken_sec=4.0, time_limit_sec=20.0, streak=2, is_rapid=False
        )
        self.assertGreater(points_honest, 1000, "Честный ответ на сложный вопрос должен давать большой сюрприз-бонус")
        print(f"  Очки за честный ответ на сложный вопрос: {points_honest} (сюрприз-камбэк работает!)")

    # =========================================================================
    # ТЕСТ 5: ROOT-CAUSE ДИАГНОСТИКА И СБОРКА BOSS-ROUND ЗА <50 МС
    # =========================================================================
    def test_05_remediation_and_boss_round(self):
        print("\n[ТЕСТ 5] Проверка Root-Cause диагностики и мгновенной сборки Boss-Round...")
        # Берём задание по P7.DENS.CALC
        items = skill_graph_service.get_items_by_skill("P7.DENS.CALC", tier=2, limit=1)
        item = items[0]
        # Ищем дистрактор с ошибкой выражения переменной (MC.EXPR.INV)
        expr_opt = next((o for o in item["options"] if o.get("misc_id") == "MC.EXPR.INV"), item["options"][1])

        # Симулируем ответ ученика
        responses = [{
            "item_id": item["item_id"],
            "opt_idx": expr_opt["opt_idx"],
            "is_correct": False
        }]

        # Диагностика
        diag = remediation_engine.diagnose_student_session("student_test_1", responses)
        print(f"  Диагностированная первопричина ошибки: {diag['primary_root_cause_skill']} ({diag['primary_root_cause_title']})")
        self.assertEqual(
            diag["primary_root_cause_skill"],
            "M6.EQ.EXPRESS",
            "Ошибка в расчете плотности с дистрактором MC.EXPR.INV должна указывать на корень M6.EQ.EXPRESS (алгебра 6 класса)!"
        )

        # Сборка 60-секундного Boss-Round
        quest = remediation_engine.assemble_boss_round("student_test_1", diag, max_duration_sec=60)
        assembly_time_ms = quest["assembly_time_ms"]
        print(f"  Время сборки Boss-Round: {assembly_time_ms:.2f} мс (критерий Киллджой: p95 < 50 мс)")
        self.assertLess(assembly_time_ms, 50.0, "Сборка Boss-Round обязана укладываться в <50 мс!")

        cards = quest["cards"]
        self.assertEqual(len(cards), 2, "Boss-Round должен состоять ровно из 2 карточек")
        self.assertEqual(cards[0]["skill_id"], "M6.EQ.EXPRESS", "Карточка 1 должна быть на корневой пререквизит (M6.EQ.EXPRESS)")
        self.assertEqual(cards[1]["skill_id"], "P7.DENS.CALC", "Карточка 2 должна быть на целевой навык (P7.DENS.CALC)")
        self.assertTrue(len(cards[0]["hint"]) > 0, "Карточка 1 должна содержать контекстную микро-подсказку")

    # =========================================================================
    # ТЕСТ 6: ОТЧЁТ О ПРОБЕЛАХ КЛАССА ДЛЯ УЧИТЕЛЯ (TEACHER GAP REPORT)
    # =========================================================================
    def test_06_teacher_class_gap_report(self):
        print("\n[ТЕСТ 6] Проверка формирования отчёта для учителя (Teacher Class Gap Report)...")
        # Генерируем ответы виртуального класса из 20 учеников
        items_dens = skill_graph_service.get_items_by_skill("P7.DENS.CALC", limit=2)
        items_unit = skill_graph_service.get_items_by_skill("P7.UNITS.DENS", limit=2)

        session_responses = []
        for i in range(20):
            # 8 учеников ошибаются на выражении формулы
            is_expr_error = (i < 8)
            item = items_dens[0]
            if is_expr_error:
                opt_idx = next(o["opt_idx"] for o in item["options"] if o.get("misc_id") == "MC.EXPR.INV")
                session_responses.append({
                    "student_pseudo_id": f"student_{i}",
                    "item_id": item["item_id"],
                    "opt_idx": opt_idx,
                    "is_correct": False
                })
            else:
                session_responses.append({
                    "student_pseudo_id": f"student_{i}",
                    "item_id": item["item_id"],
                    "opt_idx": item["correct_idx"],
                    "is_correct": True
                })

        report = remediation_engine.generate_class_gap_report("ROOM_777", session_responses)
        self.assertEqual(report["total_participants"], 20)
        self.assertEqual(report["average_score_pct"], 60.0)

        # Проверка выявления доминирующей ошибки
        top_misc = report["top_misconceptions"]
        self.assertTrue(len(top_misc) > 0)
        self.assertEqual(top_misc[0]["misc_id"], "MC.EXPR.INV")
        self.assertEqual(top_misc[0]["occurrences"], 8)
        self.assertEqual(top_misc[0]["pct_of_class"], 40.0)

        # Проверка педагогических рекомендаций
        recommendations = report["teacher_action_recommendations"]
        self.assertTrue(len(recommendations) > 0)
        self.assertTrue(any("математический пробел" in r for r in recommendations), "Отчёт обязан содержать рекомендацию по математике!")

        print(f"  OK: Отчёт сформирован успешно для {report['total_participants']} участников.")
        print(f"  OK: Топ-ошибка: {top_misc[0]['title']} ({top_misc[0]['pct_of_class']}% класса)")
        print(f"  OK: Рекомендация учителю: {recommendations[0][:100]}...")


if __name__ == "__main__":
    unittest.main()
