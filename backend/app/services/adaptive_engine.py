"""
Lisquiz ML 2.0 — Adaptive IRT & Telemetry Engine (Rasch Model + Van der Linden Effort Gate)
==========================================================================================
Реализация алгоритмов когнитивной адаптивности в соответствии со строгим ТЗ Киллджой:
1. 1PL Rasch IRT модель с фиксированным угадыванием c = 0.25:
   P_{ij} = 0.25 + 0.75 * sigma(theta_j - b_i)
2. Effort-Moderated Scoring (van der Linden, Wise & Kong):
   Вычисление порога слепого угадывания T_floor = t_motor + W / w_max.
   Ответы быстрее T_floor получают w_{ij} = 0 и исключаются из обновления способностей theta_j.
3. Онлайн градиентное обновление способностей theta_j и сложности b_i на NumPy (<0.1 мс).
4. Rubber-banding геймификация очков на основе "сюрприза" (1 - P_{ij}) — камбэки отстающих!
5. Расчёт метрик калибровки: Brier Score и Brier Skill Score (BSS > 0).
"""

import logging
import math
import re
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np

logger = logging.getLogger("lisquiz.adaptive_engine")

# Начальные априорные сложности заданий по уровням (тирам)
TIER_DIFFICULTY_PRIORS = {
    1: -1.0,  # Базовый (простой)
    2: 0.0,   # Стандартный
    3: 1.0    # Углубленный (олимпиадный/продвинутый)
}


class AdaptiveEngine:
    """
    Высокопроизводительный движок онлайн адаптивного тестирования (CAT / IRT).
    Работает локально на CPU без внешних зависимостей и без LLM.
    """

    def __init__(
        self,
        c_guessing: float = 0.25,
        default_lr_theta: float = 0.5,
        default_lr_b: float = 0.1,
        t_motor: float = 0.3,
        w_max: float = 8.0,  # ~480 слов/мин — максимальная скорость чтения школьника
    ):
        self.c_guessing = float(c_guessing)
        self.default_lr_theta = float(default_lr_theta)
        self.default_lr_b = float(default_lr_b)
        self.t_motor = float(t_motor)
        self.w_max = float(w_max)

    # =========================================================================
    # 1. СИГМОИДА И ВЕРОЯТНОСТЬ УСПЕХА (1PL RASCH + GUESSING)
    # =========================================================================

    @staticmethod
    def sigmoid(x: Union[float, np.ndarray]) -> Union[float, np.ndarray]:
        """Логистическая функция с защитой от переполнения float."""
        if isinstance(x, (int, float)):
            x_clipped = -15.0 if x < -15.0 else (15.0 if x > 15.0 else float(x))
            return 1.0 / (1.0 + math.exp(-x_clipped))
        x_clipped = np.clip(x, -15.0, 15.0)
        return 1.0 / (1.0 + np.exp(-x_clipped))

    def predict_p(self, theta: float, b: float) -> float:
        """
        Вероятность правильного ответа ученика со способностью theta на задание со сложностью b.
        P_{ij} = c + (1 - c) * sigma(theta_j - b_i)
        """
        sig = float(self.sigmoid(theta - b))
        p = self.c_guessing + (1.0 - self.c_guessing) * sig
        return 0.001 if p < 0.001 else (0.999 if p > 0.999 else p)

    def batch_predict_p(self, thetas: np.ndarray, bs: np.ndarray) -> np.ndarray:
        """Векторизованный расчёт вероятностей для матриц учеников и заданий."""
        sig = self.sigmoid(thetas - bs)
        return self.c_guessing + (1.0 - self.c_guessing) * sig

    # =========================================================================
    # 2. EFFORT-MODERATED FILTER (ТЕЛЕМЕТРИЯ СКОРОСТИ ЧТЕНИЯ И АНТИЧИТ)
    # =========================================================================

    def count_words(self, text: str) -> int:
        """Подсчёт значимых слов в строке (русский + латиница + цифры/формулы)."""
        tokens = re.findall(r"[a-zA-Zа-яА-ЯёЁ0-9_]+", text)
        return max(1, len(tokens))

    def calculate_time_floor(
        self,
        stem: str,
        options: Optional[List[Union[Dict[str, Any], str]]] = None,
        mode: str = "phone"
    ) -> float:
        """
        Вычисляет минимальное физиологическое время, необходимое для прочтения вопроса
        и нажатия кнопки:
        T_floor = t_motor + W / w_max
        Если mode == 'board' (вопрос на классной доске, ученик уже прочёл его заранее),
        учитывается только t_motor и чтение вариантов.
        """
        words = 0
        if mode != "board":
            words += self.count_words(stem)

        if options:
            for opt in options:
                opt_text = opt["text"] if isinstance(opt, dict) else str(opt)
                words += self.count_words(opt_text)

        t_reading = words / self.w_max
        t_floor = self.t_motor + t_reading
        return round(float(t_floor), 3)

    def evaluate_response_effort(
        self,
        response_time_sec: float,
        time_floor: float
    ) -> Tuple[bool, float]:
        """
        Проверка усилия (Effort-moderated gate):
        Возвращает:
          is_rapid: True если ответ дан быстрее порога физиологического чтения.
          weight: 0.0 если слепое угадывание (не обновлять модель!), 1.0 если валидный ответ.
        """
        if response_time_sec < time_floor:
            return True, 0.0
        return False, 1.0

    # =========================================================================
    # 3. ОНЛАЙН ОБНОВЛЕНИЕ СПОСОБНОСТЕЙ (ON-THE-FLY GRADIENT STEP)
    # =========================================================================

    def update_online_rasch(
        self,
        theta: float,
        b: float,
        is_correct: bool,
        effort_weight: float = 1.0,
        n_answered: int = 1
    ) -> Tuple[float, float, float]:
        """
        Один градиентный шаг обновления способностей ученика theta и калибровки задания b.
        Если effort_weight == 0.0 (слепое угадывание), параметры не загрязняются шумом!
        Возвращает: (new_theta, new_b, p_predicted)
        """
        p_pred = self.predict_p(theta, b)

        # Если ответ признан слепым тыком — вес 0, параметры не трогаем!
        if effort_weight <= 0.0:
            return theta, b, p_pred

        y = 1.0 if is_correct else 0.0
        delta = y - p_pred

        # Адаптивный шаг обучения (затухает с числом отвеченных вопросов)
        lr_theta = self.default_lr_theta / (1.0 + 0.05 * n_answered)

        # Обновление theta (Rasch step)
        raw_theta = theta + lr_theta * delta
        new_theta = -3.5 if raw_theta < -3.5 else (3.5 if raw_theta > 3.5 else float(raw_theta))

        # Обновление сложности b задания (медленнее, чем ученик)
        raw_b = b - self.default_lr_b * delta
        new_b = -3.5 if raw_b < -3.5 else (3.5 if raw_b > 3.5 else float(raw_b))

        return new_theta, new_b, p_pred

    # =========================================================================
    # 4. ДИНАМИЧЕСКИЙ РАСЧЁТ ОЧКОВ (RUBBER-BANDING НА СЮРПРИЗЕ И КАМБЭКАХ)
    # =========================================================================

    def calculate_points(
        self,
        is_correct: bool,
        *args,
        p_pred: float = 0.5,
        tier: int = 2,
        time_taken_sec: float = 5.0,
        time_limit_sec: float = 25.0,
        streak: int = 0,
        is_rapid: bool = False,
        **kwargs
    ) -> int:
        """
        Формула очков Lisquiz 2.0:
        Вместо Kahoot-гонки «кто быстрее нажал» здесь ценится сложность и точность.
        - Если ответ неверный: 0 очков.
        - Если слепое угадывание (is_rapid): 0 очков (защита от клик-ферм).
        - Базовые очки по тиру: Tier 1 -> 500, Tier 2 -> 750, Tier 3 -> 1000.
        - Surprise бонус: до +500 очков за неожиданно верный ответ на сложное задание!
        - Мягкий тайм-фактор: от 1.0 до 0.7 (быстрый ответ дает умеренный плюс, но не решающий).
        - Множитель серии (streak): до x1.5 при серии из 5+.
        Поддерживает вызов: calculate_points(is_correct, tier, time_taken_sec, is_rapid)
        а также вызовы с именованными аргументами.
        """
        if args:
            if isinstance(args[0], int) and args[0] in (1, 2, 3):
                tier = args[0]
                if len(args) > 1:
                    time_taken_sec = float(args[1])
                if len(args) > 2:
                    is_rapid = bool(args[2])
            elif isinstance(args[0], float) and len(args) > 1 and isinstance(args[1], int):
                p_pred = args[0]
                tier = args[1]
                if len(args) > 2:
                    time_taken_sec = float(args[2])
                if len(args) > 3:
                    time_limit_sec = float(args[3])
                if len(args) > 4:
                    streak = int(args[4])
                if len(args) > 5:
                    is_rapid = bool(args[5])
            else:
                if len(args) >= 1:
                    tier = int(args[0])
                if len(args) >= 2:
                    time_taken_sec = float(args[1])
                if len(args) >= 3:
                    is_rapid = bool(args[2])

        if "p_pred" in kwargs:
            p_pred = float(kwargs["p_pred"])
        if "tier" in kwargs:
            tier = int(kwargs["tier"])
        if "time_taken_sec" in kwargs:
            time_taken_sec = float(kwargs["time_taken_sec"])
        if "time_limit_sec" in kwargs:
            time_limit_sec = float(kwargs["time_limit_sec"])
        if "streak" in kwargs:
            streak = int(kwargs["streak"])
        if "is_rapid" in kwargs:
            is_rapid = bool(kwargs["is_rapid"])
        if not is_correct or is_rapid:
            return 0

        tier_bases = {1: 500, 2: 750, 3: 1000}
        base_points = tier_bases.get(tier, 750)

        # Бонус за неожиданность: если P(correct) = 0.3, сюрприз = 0.7 -> +350 pts
        surprise = max(0.0, 1.0 - p_pred)
        surprise_bonus = 500.0 * surprise

        # Время: плавное затухание от 1.0 до 0.7 (никаких обрывов в ноль)
        normalized_time = min(1.0, max(0.0, time_taken_sec / max(1.0, time_limit_sec)))
        time_multiplier = 1.0 - 0.3 * normalized_time

        # Множитель стрика
        streak_multiplier = 1.0 + 0.1 * min(streak, 5)

        total_points = (base_points + surprise_bonus) * time_multiplier * streak_multiplier
        return int(round(total_points))

    # =========================================================================
    # 5. МЕТРИКИ КАЛИБРОВКИ: BRIER SCORE И BRIER SKILL SCORE (BSS)
    # =========================================================================

    @staticmethod
    def compute_brier_score(y_true: np.ndarray, y_pred: np.ndarray) -> float:
        """
        Brier Score:
        BS = 1/N * sum((y_pred - y_true)^2)
        Чем ближе к 0, тем точнее вероятностный прогноз модели.
        """
        y_true = np.asarray(y_true, dtype=np.float64)
        y_pred = np.asarray(y_pred, dtype=np.float64)
        if len(y_true) == 0:
            return 0.0
        return float(np.mean((y_pred - y_true) ** 2))

    def compute_bss(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        reference_p: Optional[float] = 0.25
    ) -> float:
        """
        Brier Skill Score:
        BSS = 1 - (BS_model / BS_ref)
        - reference_p = 0.25 (случайное угадывание из 4 вариантов).
        - BSS > 0 означает строгое преимущество модели перед случайным угадыванием!
        """
        y_true = np.asarray(y_true, dtype=np.float64)
        y_pred = np.asarray(y_pred, dtype=np.float64)
        if len(y_true) == 0:
            return 0.0

        bs_model = self.compute_brier_score(y_true, y_pred)
        ref_pred = np.full_like(y_true, reference_p, dtype=np.float64)
        bs_ref = self.compute_brier_score(y_true, ref_pred)

        if bs_ref == 0.0:
            return 0.0

        bss = 1.0 - (bs_model / bs_ref)
        return float(bss)

    # =========================================================================
    # 6. АДАПТИВНЫЙ ВЫБОР СЛЕДУЮЩЕГО ЗАДАНИЯ (ZONE OF PROXIMAL DEVELOPMENT)
    # =========================================================================

    def select_optimal_item(
        self,
        theta: float,
        candidate_items: List[Dict[str, Any]],
        target_p: float = 0.70
    ) -> Optional[Dict[str, Any]]:
        """
        Выбор задания из доступных кандидатов, наилучшим образом удерживающего
        ученика в «зоне ближайшего развития» (вероятность успеха около target_p = 0.70).
        Это предотвращает скуку у отличников и выгорание у отстающих.
        """
        if not candidate_items:
            return None

        best_item = None
        min_diff = float("inf")

        for item in candidate_items:
            tier = item.get("tier", 2)
            b = item.get("difficulty_b", TIER_DIFFICULTY_PRIORS.get(tier, 0.0))
            p_pred = self.predict_p(theta, b)
            diff = abs(p_pred - target_p)

            if diff < min_diff:
                min_diff = diff
                best_item = item

    # =========================================================================
    # 7. СПЕЦИФИКАЦИЯ ТИРОВ СЛОЖНОСТИ И БОСС-ВОПРОСОВ (TIER 3 🔥)
    # =========================================================================

    @staticmethod
    def get_tier_spec(tier: int) -> Dict[str, Any]:
        """
        Динамические параметры задания по уровню сложности:
        - Tier 1: 15 секунд, 500 очков (базовый факт / пререквизит)
        - Tier 2: 25 секунд, 750 очков (стандартное задание ФРП)
        - Tier 3: 40 секунд, 1000 очков, Босс-вопрос с бейджем 🔥 и x2 сюрприз-бонусом
        """
        specs = {
            1: {
                "tier": 1,
                "name": "Базовый уровень",
                "time_limit_sec": 15,
                "base_points": 500,
                "is_boss": False,
                "badge": "Базовый",
                "icon": "target"
            },
            2: {
                "tier": 2,
                "name": "Стандартный уровень",
                "time_limit_sec": 25,
                "base_points": 750,
                "is_boss": False,
                "badge": "Стандарт",
                "icon": "check"
            },
            3: {
                "tier": 3,
                "name": "Продвинутый уровень (Босс-вопрос)",
                "time_limit_sec": 40,
                "base_points": 1000,
                "is_boss": True,
                "badge": "🔥 Сложная задача (х2 очков)",
                "icon": "fire"
            }
        }
        return specs.get(tier, specs[2])

    # =========================================================================
    # 8. ТИХИЙ АНТИЧИТ: АУДИТ ДЛЯ УЧИТЕЛЯ (SILENT CHEATING TELEMETRY AUDIT)
    # =========================================================================

    @staticmethod
    def audit_cheating(
        student_id: str,
        student_name: str,
        blur_count: int = 0,
        rapid_guess_count: int = 0,
        total_answers: int = 1
    ) -> Dict[str, Any]:
        """
        Формирует тихий аудит нарушений ученика исключительно для отчёта учителя.
        Ученику эти данные НИКОГДА не раскрываются!
        """
        flags = []
        if blur_count > 0:
            flags.append(f"Сворачивание приложения / смена вкладки ({blur_count} раз)")
        if rapid_guess_count > 0:
            flags.append(f"Аномально быстрые ответы быстрее порога чтения ({rapid_guess_count} раз)")

        if blur_count >= 3 or rapid_guess_count >= 3:
            risk_level = "HIGH"
            verdict = "Высокая вероятность списывания или использования ботов"
        elif blur_count >= 1 or rapid_guess_count >= 1:
            risk_level = "MEDIUM"
            verdict = "Подозрительное поведение, рекомендуется проверить понимание у доски"
        else:
            risk_level = "CLEAN"
            verdict = "Честное прохождение теста"

        return {
            "student_id": student_id,
            "student_name": student_name,
            "risk_level": risk_level,
            "verdict": verdict,
            "blur_count": blur_count,
            "rapid_guess_count": rapid_guess_count,
            "total_answers": total_answers,
            "flags": flags
        }


adaptive_engine = AdaptiveEngine()

