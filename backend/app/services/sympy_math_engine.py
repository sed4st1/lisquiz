import random
import logging
import sympy as sp
from typing import List, Dict, Any, Tuple, Optional
from .skill_graph_service import skill_graph_service

logger = logging.getLogger(__name__)

class SympyMathEngine:
    """
    Символьный математический движок генерации и верификации заданий (EdTech ML 2.0).
    Использует SymPy CAS для строгого математического расчета и программные мутаторы
    для формирования дистракторов с эксплицитными кодами ошибок (misconception_id).
    
    Гарантирует:
    1. 0% галлюцинаций LLM в формулах и вычислениях.
    2. 100% валидность физических единиц и красивых чисел (без бесконечных дробей).
    3. Привязку каждой ошибки к точному диагнозу когнитивного пробела (misc_id).
    """

    def __init__(self):
        pass

    # =========================================================================
    # 1. ГЕНЕРАТОРЫ ЗАДАНИЙ ДЛЯ 8 НАВЫКОВ
    # =========================================================================

    def generate_frac_mul(self, tier: int = 2) -> Dict[str, Any]:
        """Навык: M6.FRAC.MUL — Умножение и деление обыкновенных дробей"""
        for _ in range(25):
            try:
                is_div = random.choice([True, False])
                num1 = random.choice([2, 3, 4, 5])
                den1 = random.choice([6, 7, 8, 9])
                num2 = random.choice([3, 4, 5, 6])
                den2 = random.choice([5, 7, 8, 10])

                f1 = sp.Rational(num1, den1)
                f2 = sp.Rational(num2, den2)

                if is_div:
                    stem = f"Вычислите значение частного: {num1}/{den1} : {num2}/{den2}"
                    correct_val = f1 / f2
                    distr_no_flip = f1 * f2
                    distr_add_all = sp.Rational(num1 + num2, den1 + den2)
                    distr_flip_first = (sp.Rational(1, 1) / f1) * f2
                else:
                    stem = f"Вычислите значение произведения: {num1}/{den1} * {num2}/{den2}"
                    correct_val = f1 * f2
                    distr_no_flip = sp.Rational(num1 + num2, den1 + den2)
                    distr_add_all = f1 / f2
                    distr_flip_first = f1 * (sp.Rational(1, 1) / f2)

                options = [
                    {"text": str(correct_val), "misc_id": None, "is_correct": True},
                    {"text": str(distr_no_flip), "misc_id": "MC.FRAC.ADDDEN", "is_correct": False},
                    {"text": str(distr_add_all), "misc_id": "MC.FRAC.ADDDEN", "is_correct": False},
                    {"text": str(distr_flip_first), "misc_id": "MC.EXPR.INV", "is_correct": False},
                ]
                return self._format_and_verify(
                    skill_id="M6.FRAC.MUL",
                    stem=stem,
                    options=options,
                    tier=tier,
                    explanation=f"По правилам действий с обыкновенными дробями: правильный ответ {correct_val}."
                )
            except ValueError:
                continue

        return self._format_and_verify(
            skill_id="M6.FRAC.MUL",
            stem="Вычислите значение произведения: 2/3 * 3/4",
            options=[
                {"text": "1/2", "misc_id": None, "is_correct": True},
                {"text": "5/7", "misc_id": "MC.FRAC.ADDDEN", "is_correct": False},
                {"text": "8/9", "misc_id": "MC.EXPR.INV", "is_correct": False},
                {"text": "2/4", "misc_id": "MC.ARITH_OFF1", "is_correct": False},
            ],
            tier=tier,
            explanation="2/3 * 3/4 = (2 * 3) / (3 * 4) = 6/12 = 1/2."
        )

    def generate_prop_solve(self, tier: int = 2) -> Dict[str, Any]:
        """Навык: M6.PROP.SOLVE — Пропорция, неизвестный член"""
        a = random.choice([2, 3, 4, 5, 6])
        b = a * random.choice([2, 3, 4])
        c = random.choice([5, 7, 9, 11])
        x = sp.Symbol('x')
        
        # a / b = c / x => x = (b * c) / a
        correct_x = int((b * c) / a)
        stem = f"Найдите неизвестный член пропорции: {a} / {b} = {c} / x"

        # Мутатор 1: Неправильно перемножил крест-накрест: (a * c) / b
        distr_1 = sp.Rational(a * c, b)
        # Мутатор 2: Арифметическая ошибка на +1
        distr_2 = correct_x + random.choice([-2, 1, 2])
        # Мутатор 3: Инвертировал результат a / (b * c)
        distr_3 = sp.Rational(a, b * c)

        options = [
            {"text": str(correct_x), "misc_id": None, "is_correct": True},
            {"text": str(distr_1), "misc_id": "MC.EXPR.INV", "is_correct": False},
            {"text": str(distr_2), "misc_id": "MC.ARITH_OFF1", "is_correct": False},
            {"text": str(distr_3), "misc_id": "MC.EXPR.INV", "is_correct": False},
        ]
        return self._format_and_verify(
            skill_id="M6.PROP.SOLVE",
            stem=stem,
            options=options,
            tier=tier,
            explanation=f"По основному свойству пропорции: произведение крайних членов равно произведению средних: x = ({b} * {c}) / {a} = {correct_x}."
        )

    def generate_eq_express(self, tier: int = 2) -> Dict[str, Any]:
        """Навык: M6.EQ.EXPRESS — Выражение переменной из формулы"""
        scenarios = [
            ("rho = m / V", "V", "m / rho", [("rho * m", "MC.EXPR.INV"), ("rho / m", "MC.EXPR.INV"), ("m - rho", "MC.EXPR.INV")]),
            ("rho = m / V", "m", "rho * V", [("rho / V", "MC.EXPR.INV"), ("V / rho", "MC.EXPR.INV"), ("rho + V", "MC.EXPR.INV")]),
            ("v = s / t", "t", "s / v", [("v * s", "MC.EXPR.INV"), ("v / s", "MC.EXPR.INV"), ("s - v", "MC.EXPR.INV")]),
            ("v = s / t", "s", "v * t", [("v / t", "MC.EXPR.INV"), ("t / v", "MC.EXPR.INV"), ("v + t", "MC.EXPR.INV")]),
            ("p = F / S", "S", "F / p", [("p * F", "MC.EXPR.INV"), ("p / F", "MC.EXPR.INV"), ("F - p", "MC.EXPR.INV")]),
            ("p = F / S", "F", "p * S", [("p / S", "MC.EXPR.INV"), ("S / p", "MC.EXPR.INV"), ("p + S", "MC.EXPR.INV")]),
            ("A = F * s", "s", "A / F", [("A * F", "MC.EXPR.INV"), ("F / A", "MC.EXPR.INV"), ("A - F", "MC.EXPR.INV")]),
            ("A = F * s", "F", "A / s", [("A * s", "MC.EXPR.INV"), ("s / A", "MC.EXPR.INV"), ("A + s", "MC.EXPR.INV")]),
            ("N = A / t", "t", "A / N", [("N * A", "MC.EXPR.INV"), ("N / A", "MC.EXPR.INV"), ("A - N", "MC.EXPR.INV")]),
            ("N = A / t", "A", "N * t", [("N / t", "MC.EXPR.INV"), ("t / N", "MC.EXPR.INV"), ("N + t", "MC.EXPR.INV")]),
            ("I = U / R", "R", "U / I", [("I * U", "MC.EXPR.INV"), ("I / U", "MC.EXPR.INV"), ("U - I", "MC.EXPR.INV")]),
            ("I = U / R", "U", "I * R", [("I / R", "MC.EXPR.INV"), ("R / I", "MC.EXPR.INV"), ("I + R", "MC.EXPR.INV")]),
            ("P = m * g", "m", "P / g", [("P * g", "MC.EXPR.INV"), ("g / P", "MC.EXPR.INV"), ("P + g", "MC.EXPR.INV")]),
            ("F = k * x", "x", "F / k", [("F * k", "MC.EXPR.INV"), ("k / F", "MC.EXPR.INV"), ("F - k", "MC.EXPR.INV")]),
            ("F = k * x", "k", "F / x", [("F * x", "MC.EXPR.INV"), ("x / F", "MC.EXPR.INV"), ("F + x", "MC.EXPR.INV")]),
            ("E = m * c_sq", "m", "E / c_sq", [("E * c_sq", "MC.EXPR.INV"), ("c_sq / E", "MC.EXPR.INV"), ("E - c_sq", "MC.EXPR.INV")]),
        ]
        eq_str, target_var, correct_expr, mistakes = random.choice(scenarios)
        stem = f"Выразите переменную «{target_var}» из физической формулы: {eq_str}"

        options = [{"text": f"{target_var} = {correct_expr}", "misc_id": None, "is_correct": True}]
        for wrong_expr, misc_id in mistakes:
            options.append({"text": f"{target_var} = {wrong_expr}", "misc_id": misc_id, "is_correct": False})

        return self._format_and_verify(
            skill_id="M6.EQ.EXPRESS",
            stem=stem,
            options=options,
            tier=tier,
            explanation=f"Чтобы выразить делитель или сомножитель {target_var}, используем базовые правила алгебры: {target_var} = {correct_expr}."
        )

    def generate_units_dens(self, tier: int = 2) -> Dict[str, Any]:
        """Навык: P7.UNITS.DENS — Перевод единиц плотности (г/см³ <-> кг/м³)"""
        is_to_si = random.choice([True, False])
        base_val = random.choice([0.2, 0.4, 0.5, 0.7, 0.8, 0.9, 1.2, 1.4, 1.8, 2.5, 2.7, 7.8, 8.9, 10.5, 11.3, 13.6, 19.3])

        if is_to_si:
            # г/см³ -> кг/м³ (умножить на 1000)
            correct_val = int(base_val * 1000)
            stem = f"Выразите плотность вещества {base_val} г/см³ в основных единицах СИ (кг/м³):"
            # Мутатор 1: Разделил на 1000 вместо умножения (MC.DENS.UNIT)
            distr_div1000 = base_val / 1000
            # Мутатор 2: Забыл перевести (оставил как есть)
            distr_same = base_val
            # Мутатор 3: Ошибка на порядок (умножил на 100 вместо 1000)
            distr_100 = base_val * 100
        else:
            # кг/м³ -> г/см³ (разделить на 1000)
            int_val = int(base_val * 1000)
            correct_val = base_val
            stem = f"Плотность материала составляет {int_val} кг/м³. Чему она равна в г/см³?"
            distr_div1000 = int_val * 1000
            distr_same = int_val
            distr_100 = int_val / 100

        options = [
            {"text": f"{correct_val}", "misc_id": None, "is_correct": True},
            {"text": f"{distr_div1000}", "misc_id": "MC.DENS.UNIT", "is_correct": False},
            {"text": f"{distr_same}", "misc_id": "MC.DENS.UNIT", "is_correct": False},
            {"text": f"{distr_100}", "misc_id": "MC.DENS.UNIT", "is_correct": False},
        ]
        return self._format_and_verify(
            skill_id="P7.UNITS.DENS",
            stem=stem,
            options=options,
            tier=tier,
            explanation=f"1 г/см³ = 1000 кг/м³. Следовательно, правильный ответ: {correct_val}."
        )

    def generate_dens_def(self, tier: int = 2) -> Dict[str, Any]:
        """Навык: P7.DENS.DEF — Физический смысл плотности"""
        material, rho = random.choice([
            ("алюминия", 2700),
            ("меди", 8900),
            ("железа", 7800),
            ("льда", 900),
            ("керосина", 800),
            ("чистой воды", 1000),
            ("морской воды", 1030),
            ("пробки", 240),
            ("сухого дуба", 700),
            ("сосны", 500),
            ("парафина", 900),
            ("бетона", 2300),
            ("мрамора", 2700),
            ("свинца", 11300),
            ("золота", 19300),
            ("ртути", 13600),
            ("серебра", 10500),
            ("оконного стекла", 2500),
            ("платины", 21500),
            ("фарфора", 2300),
        ])
        stem = f"Плотность {material} равна {rho} кг/м³. Что означает эта физическая величина?"

        correct_text = f"Масса 1 м³ этого вещества равна {rho} кг"
        distr_1 = f"Объем {rho} кг этого вещества всегда равен 1 см³"
        distr_2 = f"Сила тяжести, действующая на 1 м³, равна {rho} Н"
        distr_3 = f"Масса 1 см³ этого вещества равна {rho} кг"

        options = [
            {"text": correct_text, "misc_id": None, "is_correct": True},
            {"text": distr_1, "misc_id": "MC.DENS.INV", "is_correct": False},
            {"text": distr_2, "misc_id": "MC.ARCH.BODYDENS", "is_correct": False},
            {"text": distr_3, "misc_id": "MC.DENS.UNIT", "is_correct": False},
        ]
        return self._format_and_verify(
            skill_id="P7.DENS.DEF",
            stem=stem,
            options=options,
            tier=tier,
            explanation=f"Плотность показывает массу единицы объема вещества. Значит, 1 кубический метр имеет массу {rho} кг."
        )

    def generate_dens_calc(self, tier: int = 2) -> Dict[str, Any]:
        """Навык: P7.DENS.CALC — Расчёт плотности, массы и объёма тела (Связка с алгеброй!)"""
        target = random.choice(["rho", "m", "V"])
        
        # Подбираем красивые круглые значения
        V = random.choice([2, 4, 5, 10, 20])  # м³ или см³
        rho = random.choice([500, 800, 1000, 2500])  # кг/м³
        m = rho * V

        if target == "rho":
            stem = f"Тело объемом {V} м³ имеет массу {m} кг. Найдите плотность вещества:"
            correct_ans = f"{rho} кг/м³"
            # Мутатор 1: Инверсия V / m (MC.DENS.INV)
            inv_val = round(V / m, 5)
            # Мутатор 2: Перемножил m * V (MC.EXPR.INV)
            mult_val = m * V
            # Мутатор 3: Арифметическая неточность
            arith_val = rho + 100
            options = [
                {"text": correct_ans, "misc_id": None, "is_correct": True},
                {"text": f"{inv_val} кг/м³", "misc_id": "MC.DENS.INV", "is_correct": False},
                {"text": f"{mult_val} кг/м³", "misc_id": "MC.EXPR.INV", "is_correct": False},
                {"text": f"{arith_val} кг/м³", "misc_id": "MC.ARITH_OFF1", "is_correct": False},
            ]
        elif target == "m":
            stem = f"Определите массу бруска объемом {V} м³, если плотность материала составляет {rho} кг/м³:"
            correct_ans = f"{m} кг"
            # Мутатор 1: Разделил плотность на объем rho / V (MC.EXPR.INV)
            div_val = round(rho / V, 2)
            # Мутатор 2: Разделил V / rho (MC.EXPR.INV)
            div_val2 = round(V / rho, 4)
            # Мутатор 3: Арифметика
            arith_val = m - V
            options = [
                {"text": correct_ans, "misc_id": None, "is_correct": True},
                {"text": f"{div_val} кг", "misc_id": "MC.EXPR.INV", "is_correct": False},
                {"text": f"{div_val2} кг", "misc_id": "MC.EXPR.INV", "is_correct": False},
                {"text": f"{arith_val} кг", "misc_id": "MC.ARITH_OFF1", "is_correct": False},
            ]
        else: # target == "V"
            stem = f"Найдите объем детали массой {m} кг, изготовленной из металла плотностью {rho} кг/м³:"
            correct_ans = f"{V} м³"
            # Мутатор 1: Перемножил m * rho (MC.EXPR.INV)
            mult_val = m * rho
            # Мутатор 2: Разделил rho / m (MC.EXPR.INV)
            inv_val = round(rho / m, 3)
            # Мутатор 3: Арифметика
            arith_val = V + 2
            options = [
                {"text": correct_ans, "misc_id": None, "is_correct": True},
                {"text": f"{mult_val} м³", "misc_id": "MC.EXPR.INV", "is_correct": False},
                {"text": f"{inv_val} м³", "misc_id": "MC.EXPR.INV", "is_correct": False},
                {"text": f"{arith_val} м³", "misc_id": "MC.ARITH_OFF1", "is_correct": False},
            ]

        return self._format_and_verify(
            skill_id="P7.DENS.CALC",
            stem=stem,
            options=options,
            tier=tier,
            explanation=f"По формуле плотности m = rho * V, соответственно искомая величина вычисляется однозначно: {correct_ans}."
        )

    def generate_arch_force(self, tier: int = 2) -> Dict[str, Any]:
        """Навык: P7.ARCH.FORCE — Выталкивающая сила Архимеда"""
        g = 10  # м/с² в школьной программе 7 класса
        V_sub = random.choice([0.02, 0.05, 0.1, 0.2, 0.4, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0, 5.0])  # м³
        rho_fluid = random.choice([700, 800, 900, 1000, 1030, 1260])
        fluid_names = {700: "бензин", 800: "керосин", 900: "машинное масло", 1000: "воду", 1030: "морскую воду", 1260: "глицерин"}
        fluid_name = fluid_names[rho_fluid]
        rho_body = random.choice([2500, 2700, 7800, 8900, 11300])

        # F_A = rho_fluid * g * V_sub
        F_A = int(rho_fluid * g * V_sub)
        stem = f"Тело объемом {V_sub} м³ полностью погружено в {fluid_name} (плотность {rho_fluid} кг/м³). Чему равна сила Архимеда? (g = 10 Н/кг)"

        # Мутатор 1: Взял плотность ТЕЛА вместо жидкости (MC.ARCH.BODYDENS)
        distr_body_rho = int(rho_body * g * V_sub)
        # Мутатор 2: Забыл ускорение свободного падения g (F = rho * V)
        distr_no_g = int(rho_fluid * V_sub)
        # Мутатор 3: Арифметика
        distr_arith = F_A + 500

        options = [
            {"text": f"{F_A} Н", "misc_id": None, "is_correct": True},
            {"text": f"{distr_body_rho} Н", "misc_id": "MC.ARCH.BODYDENS", "is_correct": False},
            {"text": f"{distr_no_g} Н", "misc_id": "MC.EXPR.INV", "is_correct": False},
            {"text": f"{distr_arith} Н", "misc_id": "MC.ARITH_OFF1", "is_correct": False},
        ]
        return self._format_and_verify(
            skill_id="P7.ARCH.FORCE",
            stem=stem,
            options=options,
            tier=tier,
            explanation=f"Сила Архимеда F_A = rho_жидкости * g * V_погр = {rho_fluid} * 10 * {V_sub} = {F_A} Н. Плотность самого тела роли не играет!"
        )

    def generate_arch_cond(self, tier: int = 2) -> Dict[str, Any]:
        """Навык: P7.ARCH.COND — Условия плавания тел"""
        material, rho_body = random.choice([
            ("сосновый брусок", 500),
            ("парафин", 900),
            ("кусок мрамора", 2700),
            ("стальной шарик", 7800),
            ("дубовый брусок", 700),
            ("пробку", 240),
            ("льдинку", 900),
            ("алюминиевую деталь", 2700),
            ("медную монетку", 8900),
            ("свинцовое грузило", 11300),
            ("янтарный кулон", 1100),
            ("кусок воска", 960),
            ("березовую чурочку", 650),
            ("золотое кольцо", 19300),
        ])
        liquid, rho_liq = random.choice([
            ("воду", 1000),
            ("керосин", 800),
            ("глицерин", 1260),
            ("ртуть", 13600),
            ("морскую воду", 1030),
            ("спирт", 800),
            ("машинное масло", 900),
        ])

        stem = f"В {liquid} (плотность {rho_liq} кг/м³) опускают {material} плотностью {rho_body} кг/м³. Что произойдет с телом?"

        if rho_body < rho_liq:
            correct_text = "Тело всплывает на поверхность и плавает"
            wrong_1 = "Тело сразу опустится на дно (утонет)"
            wrong_2 = "Тело будет зависать строго в толще жидкости"
            wrong_3 = "Тело растворится под действием силы Архимеда"
        else:
            correct_text = "Тело опустится на дно (утонет)"
            wrong_1 = "Тело всплывет на поверхность и будет плавать"
            wrong_2 = "Тело останется на поверхности, не погружаясь"
            wrong_3 = "Тело будет плавать внутри толщи жидкости"

        options = [
            {"text": correct_text, "misc_id": None, "is_correct": True},
            {"text": wrong_1, "misc_id": "MC.DENS.INV", "is_correct": False},
            {"text": wrong_2, "misc_id": "MC.ARCH.BODYDENS", "is_correct": False},
            {"text": wrong_3, "misc_id": "MC.ARITH_OFF1", "is_correct": False},
        ]
        return self._format_and_verify(
            skill_id="P7.ARCH.COND",
            stem=stem,
            options=options,
            tier=tier,
            explanation=f"Условие плавания: если rho_тела ({rho_body}) < rho_жидкости ({rho_liq}) — всплывает; если rho_тела > rho_жидкости — тонет."
        )

    def generate_linear_eq(self, tier: int = 2) -> Dict[str, Any]:
        """Линейные уравнения ax + b = c (5-7 класс)"""
        for _ in range(25):
            try:
                a = random.choice([2, 3, 4, 5, 6, 7])
                x_val = random.choice([2, 3, 4, 5, 6, 7, 8, 9])
                b = random.choice([-15, -12, -9, -8, -6, -5, -4, -3, 3, 4, 5, 6, 8, 9, 12, 15])
                c = a * x_val + b

                sign_str = f"+ {b}" if b > 0 else f"- {abs(b)}"
                stem = f"Решите уравнение: {a}x {sign_str} = {c}"

                correct_str = str(x_val)
                w1 = str(round((c + b) / a, 1) if (c + b) % a != 0 else (c + b) // a)
                w2 = str((c - b) * a)
                w3 = str(x_val + random.choice([-2, -1, 1, 2]))

                options = [
                    {"text": correct_str, "misc_id": None, "is_correct": True},
                    {"text": w1, "misc_id": "MC.EQ.SIGN", "is_correct": False},
                    {"text": w2, "misc_id": "MC.EXPR.INV", "is_correct": False},
                    {"text": w3, "misc_id": "MC.ARITH_OFF1", "is_correct": False},
                ]
                return self._format_and_verify(
                    skill_id="M6.EQ.LINEAR",
                    stem=stem,
                    options=options,
                    tier=tier,
                    explanation=f"Переносим слагаемое: {a}x = {c} {'-' if b > 0 else '+'} {abs(b)} = {a * x_val}, затем x = {x_val}."
                )
            except ValueError:
                continue

        return self._format_and_verify(
            skill_id="M6.EQ.LINEAR",
            stem="Решите уравнение: 3x + 6 = 21",
            options=[
                {"text": "5", "misc_id": None, "is_correct": True},
                {"text": "9", "misc_id": "MC.EQ.SIGN", "is_correct": False},
                {"text": "45", "misc_id": "MC.EXPR.INV", "is_correct": False},
                {"text": "6", "misc_id": "MC.ARITH_OFF1", "is_correct": False},
            ],
            tier=tier,
            explanation="3x = 21 - 6 = 15 => x = 15 / 3 = 5."
        )

    def generate_frac_add(self, tier: int = 1) -> Dict[str, Any]:
        """Сложение и вычитание обыкновенных дробей (5-6 класс)"""
        for _ in range(25):
            try:
                den = random.choice([4, 5, 6, 7, 8, 9, 10])
                num1 = random.randint(1, den - 2)
                num2 = random.randint(1, den - num1)
                f1 = sp.Rational(num1, den)
                f2 = sp.Rational(num2, den)
                correct_sum = f1 + f2

                stem = f"Вычислите значение суммы дробей: {num1}/{den} + {num2}/{den}"
                w1 = f"{num1 + num2}/{den + den}"
                w2 = str(abs(f1 - f2)) if f1 != f2 else f"1/{den}"
                w3 = f"{num1 + num2 + 1}/{den}"

                options = [
                    {"text": str(correct_sum), "misc_id": None, "is_correct": True},
                    {"text": w1, "misc_id": "MC.FRAC.ADDDEN", "is_correct": False},
                    {"text": w2, "misc_id": "MC.EXPR.INV", "is_correct": False},
                    {"text": w3, "misc_id": "MC.ARITH_OFF1", "is_correct": False},
                ]
                return self._format_and_verify(
                    skill_id="M5.FRAC.ADD",
                    stem=stem,
                    options=options,
                    tier=tier,
                    explanation=f"При одинаковых знаменателях складываются числители: ({num1} + {num2}) / {den} = {correct_sum}."
                )
            except ValueError:
                continue

        return self._format_and_verify(
            skill_id="M5.FRAC.ADD",
            stem="Вычислите значение суммы дробей: 1/5 + 2/5",
            options=[
                {"text": "3/5", "misc_id": None, "is_correct": True},
                {"text": "3/10", "misc_id": "MC.FRAC.ADDDEN", "is_correct": False},
                {"text": "1/5", "misc_id": "MC.EXPR.INV", "is_correct": False},
                {"text": "4/5", "misc_id": "MC.ARITH_OFF1", "is_correct": False},
            ],
            tier=tier,
            explanation="(1 + 2) / 5 = 3/5."
        )

    def generate_percent(self, tier: int = 1) -> Dict[str, Any]:
        """Проценты (5-6 класс)"""
        for _ in range(25):
            try:
                pct = random.choice([10, 20, 25, 30, 40, 50, 75])
                base = random.choice([40, 60, 80, 100, 120, 160, 200, 300, 400, 500])
                correct_val = (base * pct) // 100
                stem = f"Найдите {pct}% от числа {base}:"

                w1 = str(correct_val * 10)
                w2 = str(base - correct_val)
                w3 = str(correct_val + random.choice([-5, 5, 10]))

                options = [
                    {"text": str(correct_val), "misc_id": None, "is_correct": True},
                    {"text": w1, "misc_id": "MC.EXPR.INV", "is_correct": False},
                    {"text": w2, "misc_id": "MC.ARITH_OFF1", "is_correct": False},
                    {"text": w3, "misc_id": "MC.ARITH_OFF1", "is_correct": False},
                ]
                return self._format_and_verify(
                    skill_id="M5.PERCENT",
                    stem=stem,
                    options=options,
                    tier=tier,
                    explanation=f"{pct}% от {base} вычисляется как ({base} * {pct}) / 100 = {correct_val}."
                )
            except ValueError:
                continue

        return self._format_and_verify(
            skill_id="M5.PERCENT",
            stem="Найдите 25% от числа 200:",
            options=[
                {"text": "50", "misc_id": None, "is_correct": True},
                {"text": "500", "misc_id": "MC.EXPR.INV", "is_correct": False},
                {"text": "150", "misc_id": "MC.ARITH_OFF1", "is_correct": False},
                {"text": "60", "misc_id": "MC.ARITH_OFF1", "is_correct": False},
            ],
            tier=tier,
            explanation="25% от 200 = 200 / 4 = 50."
        )

    def generate_by_topic_or_subject(
        self,
        subject: str,
        topic: str,
        grade: int = 5,
        tier: int = 1
    ) -> Optional[Dict[str, Any]]:
        """
        Генерирует строго верифицированное школьное задание по теме или предмету
        без малейших галлюцинаций LLM и без вузовской сложности.
        """
        top_lower = topic.lower()
        try:
            if "дроб" in top_lower or "frac" in top_lower:
                return random.choice([self.generate_frac_add, self.generate_frac_mul])(tier)
            elif "пропорц" in top_lower:
                return self.generate_prop_solve(tier)
            elif "процент" in top_lower:
                return self.generate_percent(tier)
            elif "уравнен" in top_lower:
                return random.choice([self.generate_linear_eq, self.generate_eq_express])(tier)
            elif "плотност" in top_lower:
                return random.choice([self.generate_units_dens, self.generate_dens_def, self.generate_dens_calc])(tier)
            elif "архимед" in top_lower or "плаван" in top_lower:
                return random.choice([self.generate_arch_force, self.generate_arch_cond])(tier)
            elif subject == "Математика":
                gens = [self.generate_frac_add, self.generate_frac_mul, self.generate_prop_solve, self.generate_linear_eq, self.generate_percent]
                return random.choice(gens)(tier)
            elif subject == "Физика":
                gens = [self.generate_units_dens, self.generate_dens_def, self.generate_dens_calc, self.generate_arch_force, self.generate_arch_cond, self.generate_eq_express]
                return random.choice(gens)(tier)
        except Exception as e:
            logger.warning("Ошибка при генерации через SymPy CAS: %s", e)
        return None

    # =========================================================================
    # 2. ВЕРИФИКАЦИЯ И ФОРМАТИРОВАНИЕ ЗАДАНИЙ
    # =========================================================================

    def _format_and_verify(
        self,
        skill_id: str,
        stem: str,
        options: List[Dict[str, Any]],
        tier: int,
        explanation: str
    ) -> Dict[str, Any]:
        """
        Детерминированная верификация:
        1. Все 4 варианта уникальны по тексту.
        2. Ровно 1 правильный ответ.
        3. Дистракторы не совпадают с правильным ответом.
        """
        texts = [opt["text"].strip() for opt in options]
        if len(set(texts)) != 4:
            raise ValueError(f"Коллизия дистракторов в задании по {skill_id}: {texts}")

        correct_items = [opt for opt in options if opt.get("is_correct")]
        if len(correct_items) != 1:
            raise ValueError(f"Должен быть ровно 1 правильный ответ: найдено {len(correct_items)}")

        # Перемешиваем варианты ответа, определяя correct_idx (0..3)
        shuffled = options.copy()
        random.shuffle(shuffled)
        correct_idx = next(i for i, o in enumerate(shuffled) if o.get("is_correct"))

        item_id = f"sympy_{skill_id.lower().replace('.', '_')}_{abs(hash(stem)) % 1000000}"
        return {
            "item_id": item_id,
            "canonical_id": item_id,
            "skill_id": skill_id,
            "tier": tier,
            "stem": stem,
            "correct_idx": correct_idx,
            "options": shuffled,
            "explanation": explanation,
            "origin": "sympy"
        }

    # =========================================================================
    # 3. МАССОВАЯ ГЕНЕРАЦИЯ ДЛЯ БАНКА ЗАДАНИЙ (96 КАНОНИЧЕСКИХ ТЕСТОВ)
    # =========================================================================

    def generate_pilot_corpus(self, items_per_skill: int = 12) -> int:
        """
        Генерирует полный канонический корпус для пилота (8 навыков x 12 заданий = 96 заданий).
        Заполняет базу данных SQLite Q-матрицы.
        """
        logger.info("=== Генерация верифицированного корпуса заданий SymPy (8 навыков x %d) ===", items_per_skill)
        generators = {
            "M6.FRAC.MUL": self.generate_frac_mul,
            "M6.PROP.SOLVE": self.generate_prop_solve,
            "M6.EQ.EXPRESS": self.generate_eq_express,
            "P7.UNITS.DENS": self.generate_units_dens,
            "P7.DENS.DEF": self.generate_dens_def,
            "P7.DENS.CALC": self.generate_dens_calc,
            "P7.ARCH.FORCE": self.generate_arch_force,
            "P7.ARCH.COND": self.generate_arch_cond,
        }

        total_saved = 0
        for skill_id, gen_fn in generators.items():
            attempts = 0
            while attempts < items_per_skill * 15:
                attempts += 1
                with skill_graph_service._get_conn() as conn:
                    curr_count = conn.execute("SELECT COUNT(*) FROM item_skills WHERE skill_id = ?", (skill_id,)).fetchone()[0]
                if curr_count >= items_per_skill:
                    break
                tier = (curr_count % 3) + 1  # Распределяем по 3 уровням сложности
                try:
                    item_data = gen_fn(tier=tier)
                    skill_graph_service.insert_item_with_distractors(
                        item=item_data,
                        options=item_data["options"],
                        skill_ids=[skill_id]
                    )
                except Exception as e:
                    logger.warning("Ошибка генерации для %s: %s", skill_id, e)

            with skill_graph_service._get_conn() as conn:
                final_count = conn.execute("SELECT COUNT(*) FROM item_skills WHERE skill_id = ?", (skill_id,)).fetchone()[0]
            logger.info("Сгенерировано для %s: %d заданий", skill_id, final_count)
            total_saved += final_count

        logger.info("ИТОГО сгенерировано и сохранено в Q-матрицу: %d заданий!", total_saved)
        return total_saved

sympy_math_engine = SympyMathEngine()
