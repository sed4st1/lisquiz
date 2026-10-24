"""
Lisquiz ML 2.0 API Router
==========================
Эндпоинты для адаптивного IRT-тестирования, графа знаний (DAG), телеметрии античита
и мгновенной сборки Boss-Round (компенсация пробелов за <50 мс).
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..services.skill_graph_service import skill_graph_service
from ..services.adaptive_engine import adaptive_engine, TIER_DIFFICULTY_PRIORS
from ..services.remediation_engine import remediation_engine
from ..services.textbook_service import textbook_service

router = APIRouter()


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class CreateRedemptionRequest(BaseModel):
    student_id: str
    target_skill_id: str
    original_item_id: Optional[str] = None
    base_points: int = 750


class SubmitRedemptionRequest(BaseModel):
    redemption_id: str
    is_correct: bool
    potential_points: int = 450


class EffortEvalRequest(BaseModel):
    stem: str
    options: List[Dict[str, Any]]
    response_time_sec: float
    mode: str = "phone"  # "phone" или "board"


class RaschStepRequest(BaseModel):
    theta: float = 0.0
    b: float = 0.0
    is_correct: bool
    response_time_sec: float = 5.0
    time_floor: float = 1.0
    n_answered: int = 1
    tier: int = 2
    time_limit_sec: float = 20.0
    streak: int = 0


class StudentResponseItem(BaseModel):
    item_id: str
    opt_idx: int
    is_correct: bool
    response_time_sec: Optional[float] = None


class StudentDiagnoseRequest(BaseModel):
    student_id: str
    responses: List[StudentResponseItem]


class BossRoundRequest(BaseModel):
    student_id: str
    diagnosis: Optional[Dict[str, Any]] = None
    responses: Optional[List[StudentResponseItem]] = None
    max_duration_sec: int = 60


class ClassGapReportRequest(BaseModel):
    room_code: str
    session_responses: List[Dict[str, Any]]


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/graph/stats")
async def get_graph_stats():
    """Статус графа знаний: проверка ацикличности (DAG), число навыков, ребер, заданий."""
    return skill_graph_service.get_stats()


@router.get("/graph/ancestors/{skill_id}")
async def get_prerequisites(skill_id: str):
    """Топологическая цепочка навыков-пререквизитов для целевого навыка."""
    ancestors = skill_graph_service.get_prerequisite_ancestors(skill_id)
    details = [skill_graph_service.get_skill_info(s) for s in ancestors]
    return {
        "skill_id": skill_id,
        "prerequisites_chain": ancestors,
        "details": [d for d in details if d]
    }


@router.get("/items/{skill_id}")
async def get_items_for_skill(
    skill_id: str,
    tier: Optional[int] = Query(None, ge=1, le=3),
    limit: int = Query(12, ge=1, le=50)
):
    """Канонические задания из Q-матрицы с дистракторами и тегами когнитивных ошибок."""
    items = skill_graph_service.get_items_by_skill(skill_id, tier=tier, limit=limit)
    return {"skill_id": skill_id, "count": len(items), "items": items}


@router.post("/evaluate-effort")
async def evaluate_effort(req: EffortEvalRequest):
    """
    Вычисление физиологического порога времени ответа ван дер Линдена:
    T_floor = t_motor + W / w_max.
    Возвращает флаг слепого тыка и вес для IRT (1.0 или 0.0).
    """
    time_floor = adaptive_engine.calculate_time_floor(req.stem, req.options, mode=req.mode)
    is_rapid, weight = adaptive_engine.evaluate_response_effort(req.response_time_sec, time_floor)
    return {
        "response_time_sec": req.response_time_sec,
        "time_floor_sec": time_floor,
        "is_rapid_guess": is_rapid,
        "effort_weight": weight,
        "explanation": "Ответ дан быстрее порога физиологического чтения текста" if is_rapid else "Валидный ответ"
    }


@router.post("/rasch-step")
async def rasch_step(req: RaschStepRequest):
    """
    Онлайн градиентный шаг IRT модели (Rasch 1PL, c=0.25) + динамические очки (Rubber-Banding).
    """
    is_rapid, weight = adaptive_engine.evaluate_response_effort(req.response_time_sec, req.time_floor)
    new_theta, new_b, p_pred = adaptive_engine.update_online_rasch(
        theta=req.theta,
        b=req.b,
        is_correct=req.is_correct,
        effort_weight=weight,
        n_answered=req.n_answered
    )
    points = adaptive_engine.calculate_points(
        is_correct=req.is_correct,
        p_pred=p_pred,
        tier=req.tier,
        time_taken_sec=req.response_time_sec,
        time_limit_sec=req.time_limit_sec,
        streak=req.streak,
        is_rapid=is_rapid
    )
    return {
        "old_theta": req.theta,
        "new_theta": round(new_theta, 4),
        "old_b": req.b,
        "new_b": round(new_b, 4),
        "predicted_p": round(p_pred, 4),
        "is_rapid_guess": is_rapid,
        "effort_weight": weight,
        "points_earned": points
    }


@router.post("/diagnose-remediation")
async def diagnose_student(req: StudentDiagnoseRequest):
    """
    Диагностика первопричин ошибок ученика по графу знаний (DAG Root-Cause).
    """
    responses_dict = [r.model_dump() for r in req.responses]
    diagnosis = remediation_engine.diagnose_student_session(req.student_id, responses_dict)
    return diagnosis


@router.post("/assemble-boss-round")
async def assemble_boss_round(req: BossRoundRequest):
    """
    Мгновенная сборка 2-карточного компенсирующего раунда (Boss-Round) за p95 < 50 мс.
    """
    diagnosis = req.diagnosis
    if not diagnosis and req.responses:
        responses_dict = [r.model_dump() for r in req.responses]
        diagnosis = remediation_engine.diagnose_student_session(req.student_id, responses_dict)

    if not diagnosis:
        diagnosis = {"student_id": req.student_id, "detailed_mistakes": []}

    boss_round = remediation_engine.assemble_boss_round(
        student_id=req.student_id,
        diagnosis=diagnosis,
        max_duration_sec=req.max_duration_sec
    )
    return boss_round


@router.post("/class-gap-report")
async def class_gap_report(req: ClassGapReportRequest):
    """
    Аналитический отчёт о пробелах класса с раскладкой по когнитивным ошибкам
    и педагогическими рекомендациями учителю (включая тихий античит аудит).
    """
    report = remediation_engine.generate_class_gap_report(req.room_code, req.session_responses)
    return report


# =============================================================================
# УМК / УЧЕБНИКИ РФ (TEXTBOOKS & PARAGRAPHS)
# =============================================================================

@router.get("/textbooks")
async def list_textbooks(
    subject: Optional[str] = Query(None, description="Фильтр по предмету (Физика, Математика, Русский язык)"),
    grade: Optional[int] = Query(None, ge=1, le=11, description="Класс")
):
    """Список школьных учебников РФ (Пёрышкин, Виленкин, Мерзляк, Ладыженская и др.)."""
    return {"textbooks": textbook_service.list_textbooks(subject=subject, grade=grade)}


@router.get("/textbooks/preset-quizzes")
async def get_preset_textbook_quizzes():
    """Готовые проверенные викторины по 6 ключевым учебникам РФ из базы Ивана."""
    return {"quizzes": textbook_service.get_preset_textbook_quizzes()}


@router.get("/textbooks/{textbook_id}")
async def get_textbook(textbook_id: str):
    """Оглавление учебника со всеми главами и параграфами."""
    tb = textbook_service.get_textbook(textbook_id)
    if not tb:
        raise HTTPException(status_code=404, detail="Учебник не найден")
    return tb


@router.get("/textbooks/{textbook_id}/paragraphs/{paragraph_num}/questions")
async def get_questions_by_paragraph(
    textbook_id: str,
    paragraph_num: int,
    limit: int = Query(5, ge=1, le=20)
):
    """
    Получить проверенные задания по конкретному параграфу выбранного учебника.
    """
    res = textbook_service.get_questions_by_paragraph(
        textbook_id=textbook_id,
        paragraph_num=paragraph_num,
        limit=limit
    )
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


# =============================================================================
# СЛОЖНОСТЬ ЗАДАНИЙ И БОСС-ВОПРОСЫ (TIER 3 🔥)
# =============================================================================

@router.get("/tier-spec/{tier}")
async def get_tier_specification(tier: int):
    """Спецификация уровня сложности: лимит времени, базовые очки, иконка и бейдж."""
    if tier not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Уровень должен быть 1, 2 или 3")
    return adaptive_engine.get_tier_spec(tier)


# =============================================================================
# РЕДЕМПШН-РАУНД: DUOLINGO-STYLE ВОЗВРАТ БАЛЛОВ ЗА РАБОТУ НАД ОШИБКАМИ
# =============================================================================

@router.post("/redemption/create")
async def create_redemption(req: CreateRedemptionRequest):
    """
    Создание сессии работы над ошибкой:
    - Контекстная микро-подсказка
    - Новое ИЗОМОРФНОЕ задание (с новыми числами)
    - Потенциал возврата 60% утерянных баллов
    """
    quest = remediation_engine.create_redemption_quest(
        student_id=req.student_id,
        target_skill_id=req.target_skill_id,
        original_item_id=req.original_item_id,
        base_points=req.base_points
    )
    return quest


@router.post("/redemption/submit")
async def submit_redemption(req: SubmitRedemptionRequest):
    """
    Проверка решения работы над ошибкой и начисление возвращённых очков (+50..60%).
    """
    res = remediation_engine.evaluate_redemption_answer(
        redemption_id=req.redemption_id,
        is_correct=req.is_correct,
        potential_points=req.potential_points
    )
    return res

