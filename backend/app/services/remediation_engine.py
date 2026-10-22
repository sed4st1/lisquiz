"""
Lisquiz ML 2.0 — Remediation & Root-Cause Diagnostic Engine
============================================================
Реализация Блока В (Remediation & Boss-Round) в строгом соответствии с ТЗ Киллджой:
1. Детерминированная диагностика первопричин ошибок (Root-Cause Analysis):
   - Ошибка в физике 7 класса (например, расчёт плотности P7.DENS.CALC) при выборе
     дистрактора MC.EXPR.INV трассируется через DAG обратно к корню:
     навыку 6 класса по математике M6.EQ.EXPRESS (выражение переменной).
2. Сборка 60-секундного Boss-Round / Micro-Quest (2 карточки) за p95 < 50 мс:
   - Карточка 1: Микро-подсказка + задание на корневой математический пререквизит (Tier 1/2).
   - Карточка 2: Задание на исходный физический навык для закрепления (Tier 2).
   - Нулевая зависимость от внешних LLM в синхронном цикле викторины.
3. Формирование отчёта о пробелах для учителя (Teacher Class Gap Report)
   с реальной раскладкой по когнитивным ошибкам.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Tuple
from app.services.skill_graph_service import skill_graph_service
from app.services.adaptive_engine import adaptive_engine

logger = logging.getLogger("lisquiz.remediation_engine")



class RemediationEngine:
    """
    Движок ликвидации пробелов и когнитивной ремедиации.
    Работает со связкой Q-матрицы и ориентированного ациклического графа навыков.
    """

    def __init__(self):
        pass

    # =========================================================================
    # 1. ROOT-CAUSE ДИАГНОСТИКА СЕССИИ УЧЕНИКА
    # =========================================================================

    def diagnose_student_session(
        self,
        student_id: str,
        responses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Анализирует все ответы ученика за сессию.
        Для каждой ошибки определяет:
        - Исходный целевой навык (symptom)
        - Выбранный дистрактор и misc_id (когнитивная ошибка)
        - Корневой навык-пререквизит (root cause) через топологический обход DAG!
        """
        total_questions = len(responses)
        correct_count = 0
        mistakes_by_misc: Dict[str, int] = {}
        mistakes_by_skill: Dict[str, int] = {}
        root_causes: Dict[str, int] = {}
        detailed_mistakes = []

        for resp in responses:
            is_correct = bool(resp.get("is_correct"))
            if is_correct:
                correct_count += 1
                continue

            item_id = resp["item_id"]
            opt_idx = resp["opt_idx"]
            item_data = skill_graph_service.get_item_details(item_id)
            if not item_data:
                continue

            target_skill_id = item_data.get("skill_id", "UNKNOWN")
            mistakes_by_skill[target_skill_id] = mistakes_by_skill.get(target_skill_id, 0) + 1

            # Ищем тег ошибки у выбранного дистрактора
            selected_misc_id = None
            selected_text = ""
            for opt in item_data.get("options", []):
                if opt.get("opt_idx") == opt_idx:
                    selected_misc_id = opt.get("misc_id")
                    selected_text = opt.get("text", "")
                    break

            misc_info = None
            root_skill_id = target_skill_id  # По умолчанию целевой

            if selected_misc_id:
                mistakes_by_misc[selected_misc_id] = mistakes_by_misc.get(selected_misc_id, 0) + 1
                misc_info = skill_graph_service.get_misconception(selected_misc_id)

                if misc_info:
                    # Навык, к которому концептуально привязана ошибка
                    origin_skill_id = misc_info.get("skill_id")
                    # Проверяем, является ли он предшественником в DAG
                    ancestors = skill_graph_service.get_prerequisite_ancestors(target_skill_id)
                    if origin_skill_id and (origin_skill_id in ancestors or origin_skill_id == target_skill_id):
                        root_skill_id = origin_skill_id
                    elif ancestors:
                        # Если ошибка указывает на фундамент, берем первый корневой пререквизит
                        root_skill_id = ancestors[0]

            root_causes[root_skill_id] = root_causes.get(root_skill_id, 0) + 1

            detailed_mistakes.append({
                "item_id": item_id,
                "target_skill_id": target_skill_id,
                "selected_opt_idx": opt_idx,
                "selected_text": selected_text,
                "misc_id": selected_misc_id,
                "misc_title": misc_info.get("title") if misc_info else "Нетипичная ошибка",
                "correction_hint": misc_info.get("correction_hint") if misc_info else item_data.get("explanation", ""),
                "root_cause_skill_id": root_skill_id
            })

        # Определение доминирующей первопричины
        primary_root_cause = None
        if root_causes:
            primary_root_cause = max(root_causes.items(), key=lambda x: x[1])[0]

        primary_misc_id = None
        if mistakes_by_misc:
            primary_misc_id = max(mistakes_by_misc.items(), key=lambda x: x[1])[0]

        root_skill_info = skill_graph_service.get_skill_info(primary_root_cause) if primary_root_cause else None

        return {
            "student_id": student_id,
            "total_questions": total_questions,
            "correct_count": correct_count,
            "accuracy": round(correct_count / max(1, total_questions), 3),
            "primary_root_cause_skill": primary_root_cause,
            "primary_root_cause_title": root_skill_info.get("title") if root_skill_info else None,
            "primary_misc_id": primary_misc_id,
            "root_causes_distribution": root_causes,
            "mistakes_by_misc": mistakes_by_misc,
            "detailed_mistakes": detailed_mistakes
        }

    # =========================================================================
    # 2. МГНОВЕННАЯ СБОРКА BOSS-ROUND / MICRO-QUEST (p95 < 50 мс)
    # =========================================================================

    def assemble_boss_round(
        self,
        student_id: str,
        diagnosis: Dict[str, Any],
        max_duration_sec: int = 60
    ) -> Dict[str, Any]:
        """
        Собирает 2-карточный компенсирующий раунд для ученика:
        Карточка 1: Проверка и отработка КОРНЕВОГО навыка-пререквизита + микро-подсказка.
        Карточка 2: Контрольное задание на целевой навык для фиксации успеха.
        Все запросы идут строго по индексу в SQLite без LLM. Время выполнения: < 10 мс.
        """
        t_start = time.perf_counter()

        root_skill_id = diagnosis.get("primary_root_cause_skill")
        detailed_mistakes = diagnosis.get("detailed_mistakes", [])

        # Если ошибок нет — ученик божит, выдаем испытание чемпиона (Tier 3)
        if not detailed_mistakes or not root_skill_id:
            items = skill_graph_service.get_items_by_skill("P7.ARCH.COND", tier=3, limit=2)
            t_elapsed_ms = (time.perf_counter() - t_start) * 1000.0
            return {
                "quest_type": "champion_challenge",
                "target_student": student_id,
                "assembly_time_ms": round(t_elapsed_ms, 2),
                "duration_limit_sec": max_duration_sec,
                "cards": [
                    {
                        "card_index": idx + 1,
                        "card_type": "challenge",
                        "item": item,
                        "hint": "Вы отлично справились с базой! Проверьте себя на олимпиадном уровне."
                    }
                    for idx, item in enumerate(items)
                ]
            }

        # Берем последнюю типичную ошибку для контекстной подсказки
        last_mistake = detailed_mistakes[-1]
        target_skill_id = last_mistake["target_skill_id"]
        hint = last_mistake.get("correction_hint", "Обратите внимание на взаимосвязь величин!")

        # Карточка 1: Задание на КОРНЕВОЙ пререквизит (Tier 1 или 2)
        root_items = skill_graph_service.get_items_by_skill(root_skill_id, tier=1, limit=3)
        if not root_items:
            root_items = skill_graph_service.get_items_by_skill(root_skill_id, limit=3)
        card1_item = root_items[0] if root_items else None

        # Карточка 2: Задание на ЦЕЛЕВОЙ навык (Tier 2)
        target_items = skill_graph_service.get_items_by_skill(target_skill_id, tier=2, limit=3)
        if not target_items:
            target_items = skill_graph_service.get_items_by_skill(target_skill_id, limit=3)
        card2_item = target_items[0] if target_items else None

        t_elapsed_ms = (time.perf_counter() - t_start) * 1000.0
        logger.info("Сборка Boss-Round для %s заняла %.2f мс (бюджет <50 мс)", student_id, t_elapsed_ms)

        cards = []
        if card1_item:
            cards.append({
                "card_index": 1,
                "card_type": "remediation_prerequisite",
                "skill_id": root_skill_id,
                "item": card1_item,
                "hint": hint,
                "pedagogical_goal": f"Ликвидация фундаментального пробела по {root_skill_id}"
            })
        if card2_item:
            cards.append({
                "card_index": 2,
                "card_type": "target_reinforcement",
                "skill_id": target_skill_id,
                "item": card2_item,
                "hint": "Теперь примените это правило к исходной физической задаче!",
                "pedagogical_goal": f"Закрепление целевого навыка {target_skill_id}"
            })

        return {
            "quest_type": "remediation_quest",
            "target_student": student_id,
            "root_cause_skill": root_skill_id,
            "target_skill": target_skill_id,
            "assembly_time_ms": round(t_elapsed_ms, 2),
            "duration_limit_sec": max_duration_sec,
            "cards": cards
        }

    # =========================================================================
    # 3. ОТЧЁТ О ПРОБЕЛАХ КЛАССА ДЛЯ УЧИТЕЛЯ (CLASS GAP REPORT + ТИХИЙ АНТИЧИТ)
    # =========================================================================

    def generate_class_gap_report(
        self,
        room_code: str,
        session_responses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Формирует педагогический отчёт для учителя с выявлением системных пробелов:
        - Общая успеваемость и число участников
        - Раскладка по когнитивным ошибкам (misconceptions) в процентах класса
        - Разделение математических и физических первопричин
        - Конкретные рекомендации для учителя по повторению
        - Тихий аудит античита (cheating_audit_log) исключительно для глаз учителя!
        """
        student_ids = set()
        student_telemetry: Dict[str, Dict[str, Any]] = {}
        total_answers = len(session_responses)
        correct_answers = 0
        misc_counts: Dict[str, int] = {}
        root_cause_counts: Dict[str, int] = {}
        skill_stats: Dict[str, Dict[str, int]] = {}

        for resp in session_responses:
            s_id = resp.get("student_pseudo_id") or resp.get("student_id", "anon")
            s_name = resp.get("student_name") or s_id
            student_ids.add(s_id)

            if s_id not in student_telemetry:
                student_telemetry[s_id] = {
                    "name": s_name,
                    "blur_count": 0,
                    "rapid_count": 0,
                    "total": 0
                }
            student_telemetry[s_id]["total"] += 1
            if resp.get("tab_blurred") or resp.get("blurred"):
                student_telemetry[s_id]["blur_count"] += 1
            if resp.get("blur_count"):
                student_telemetry[s_id]["blur_count"] = max(student_telemetry[s_id]["blur_count"], resp["blur_count"])
            if resp.get("rapid_flag") or resp.get("is_rapid"):
                student_telemetry[s_id]["rapid_count"] += 1
            if resp.get("rapid_guess_count"):
                student_telemetry[s_id]["rapid_count"] = max(student_telemetry[s_id]["rapid_count"], resp["rapid_guess_count"])

            is_correct = bool(resp.get("is_correct"))
            if is_correct:
                correct_answers += 1

            item_id = resp["item_id"]
            opt_idx = resp["opt_idx"]
            item_data = skill_graph_service.get_item_details(item_id)
            if not item_data:
                continue

            skill_id = item_data.get("skill_id", "UNKNOWN")
            if skill_id not in skill_stats:
                skill_stats[skill_id] = {"total": 0, "correct": 0}
            skill_stats[skill_id]["total"] += 1
            if is_correct:
                skill_stats[skill_id]["correct"] += 1

            if not is_correct:
                for opt in item_data.get("options", []):
                    if opt.get("opt_idx") == opt_idx and opt.get("misc_id"):
                        m_id = opt["misc_id"]
                        misc_counts[m_id] = misc_counts.get(m_id, 0) + 1
                        misc_info = skill_graph_service.get_misconception(m_id)
                        if misc_info and misc_info.get("skill_id"):
                            root_s = misc_info["skill_id"]
                            root_cause_counts[root_s] = root_cause_counts.get(root_s, 0) + 1
                        break

        total_students = max(1, len(student_ids))
        avg_score_pct = round((correct_answers / max(1, total_answers)) * 100, 1)

        # Ранжирование ошибок по частотности
        top_misconceptions = []
        for m_id, count in sorted(misc_counts.items(), key=lambda x: x[1], reverse=True):
            m_info = skill_graph_service.get_misconception(m_id)
            pct_of_students = round((count / total_students) * 100, 1)
            top_misconceptions.append({
                "misc_id": m_id,
                "title": m_info.get("title") if m_info else m_id,
                "occurrences": count,
                "pct_of_class": min(100.0, pct_of_students),
                "correction_hint": m_info.get("correction_hint", "") if m_info else ""
            })

        # Формирование рекомендаций учителю
        recommendations = []
        if "M6.EQ.EXPRESS" in root_cause_counts:
            recommendations.append(
                "📌 Обнаружен скрытый математический пробел: значительная часть учеников ошибается в выражении неизвестных из равенств (m = rho * V, V = m / rho). Рекомендуется провести 5-минутную разминку на треугольник формул и правила деления до перехода к гидростатическому давлению."
            )
        if "MC.DENS.UNIT" in misc_counts:
            recommendations.append(
                "📌 Ошибка перевода единиц: школьники путают деление и умножение на 1000 при переходе от г/см³ к кг/м³. Рекомендуется напомнить мнемоническое правило «Кубический метр плотнее и тяжелее в 1000 раз»."
            )
        if "MC.ARCH.BODYDENS" in misc_counts:
            recommendations.append(
                "📌 Физическое заблуждение в силе Архимеда: ученики подставляют в формулу F_A плотность самого тела вместо плотности окружающей жидкости. Рекомендуется демонстрационный эксперимент с погружением разных тел в одну жидкость."
            )

        if not recommendations and avg_score_pct >= 80:
            recommendations.append(
                "🎉 Класс продемонстрировал превосходное усвоение материала! Можно смело переходить к решению составных задач на плавание судов и воздухоплавание."
            )

        # Тихий аудит античита для учителя
        cheating_audit_log = [
            adaptive_engine.audit_cheating(
                student_id=s_id,
                student_name=t["name"],
                blur_count=t["blur_count"],
                rapid_guess_count=t["rapid_count"],
                total_answers=t["total"]
            )
            for s_id, t in student_telemetry.items()
        ]

        return {
            "room_code": room_code,
            "total_participants": total_students,
            "total_answers": total_answers,
            "average_score_pct": avg_score_pct,
            "skills_breakdown": [
                {
                    "skill_id": s_id,
                    "title": skill_graph_service.get_skill_info(s_id).get("title", s_id) if skill_graph_service.get_skill_info(s_id) else s_id,
                    "accuracy_pct": round((stat["correct"] / max(1, stat["total"])) * 100, 1),
                    "total_attempts": stat["total"]
                }
                for s_id, stat in skill_stats.items()
            ],
            "top_misconceptions": top_misconceptions,
            "root_cause_attribution": root_cause_counts,
            "teacher_action_recommendations": recommendations,
            "cheating_audit_log": cheating_audit_log
        }

    # =========================================================================
    # 4. DUOLINGO-STYLE REDEMPTION ROUND (ИЗОМОРФНАЯ ЗАДАЧА И ВОЗВРАТ БАЛЛОВ)
    # =========================================================================

    def generate_isomorphic_item(
        self,
        skill_id: str,
        exclude_stem: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Генерирует свежее изоморфное задание (с новыми числовыми данными и новыми дистракторами),
        чтобы ученик не мог нажать верный ответ по памяти методом исключения!
        """
        try:
            from app.services.sympy_math_engine import sympy_math_engine
            gen_map = {
                "M6.FRAC.MUL": sympy_math_engine.generate_frac_mul,
                "M6.PROP.SOLVE": sympy_math_engine.generate_prop_solve,
                "M6.EQ.EXPRESS": sympy_math_engine.generate_eq_express,
                "P7.UNITS.DENS": sympy_math_engine.generate_units_dens,
                "P7.DENS.DEF": sympy_math_engine.generate_dens_def,
                "P7.DENS.CALC": sympy_math_engine.generate_dens_calc,
                "P7.ARCH.FORCE": sympy_math_engine.generate_arch_force,
                "P7.ARCH.COND": sympy_math_engine.generate_arch_cond,
            }
            if skill_id in gen_map:
                for _ in range(5):
                    fresh = gen_map[skill_id](tier=2)
                    if fresh["stem"] != exclude_stem:
                        return fresh
        except Exception as e:
            logger.warning("Ошибка вызова SymPy генератора: %s", e)

        # Запасной вариант: выборка другого задания из банка
        items = skill_graph_service.get_items_by_skill(skill_id, limit=5)
        for it in items:
            if it["stem"] != exclude_stem:
                return it
        return items[0] if items else None

    def create_redemption_quest(
        self,
        student_id: str,
        target_skill_id: str,
        original_item_id: Optional[str] = None,
        base_points: int = 750
    ) -> Dict[str, Any]:
        """
        Создаёт сессию работы над ошибкой:
        1. Извлекает контекстную микро-подсказку по правилу.
        2. Генерирует новую ИЗОМОРФНУЮ задачу (другие числа).
        3. Рассчитывает потенциальный возврат баллов (60% от стоимости).
        """
        original_stem = None
        hint = "Вспомните формулу и логическую взаимосвязь величин!"

        if original_item_id:
            orig = skill_graph_service.get_item_details(original_item_id)
            if orig:
                original_stem = orig.get("stem")
                if orig.get("explanation"):
                    hint = orig["explanation"]

        isomorphic = self.generate_isomorphic_item(target_skill_id, exclude_stem=original_stem)
        potential_recovery = int(round(base_points * 0.60))

        redemption_id = f"redempt_{student_id}_{int(time.time() * 1000)}"
        return {
            "redemption_id": redemption_id,
            "student_id": student_id,
            "target_skill_id": target_skill_id,
            "pedagogical_hint": hint,
            "potential_points_recovery": potential_recovery,
            "isomorphic_item": isomorphic,
            "status": "ready"
        }

    def evaluate_redemption_answer(
        self,
        redemption_id: str,
        is_correct: bool,
        potential_points: int = 450
    ) -> Dict[str, Any]:
        """
        Проверка решения работы над ошибкой и начисление возвращённых очков (+50..60%).
        """
        if is_correct:
            return {
                "redemption_id": redemption_id,
                "is_correct": True,
                "points_recovered": potential_points,
                "message": f"🎉 Отлично! Ошибка проработана, вам возвращено +{potential_points} очков!"
            }
        else:
            return {
                "redemption_id": redemption_id,
                "is_correct": False,
                "points_recovered": 0,
                "message": "Ничего страшного! Главное — запомнить верное правило на будущее."
            }


remediation_engine = RemediationEngine()

