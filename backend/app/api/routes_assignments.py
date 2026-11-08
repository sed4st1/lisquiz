"""
Assignments & Quests API Router (Lisquiz 2.0)
==============================================
- Реальные задания учителя для школьных классов (Class Assignments).
- Персональная «Работа над ошибками» (Spaced Repetition / Redemption) по реальным викторинам.
- Ежедневные разминки и квесты с сохранением в БД SQLite и начислением желудей.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date, timezone
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update

from ..db.session import get_db
from ..db.models import (
    UserModel,
    ClassModel,
    ClassStudentModel,
    ClassAssignmentModel,
    StudentAssignmentSubmissionModel,
    SpacedRepetitionModel,
    UserDailyQuestModel,
    QuizModel,
)
from ..services.auth_service import auth_service
from ..services.grove_service import grove_service
from ..services.max_bot_service import max_bot_service

router = APIRouter(prefix="/api/assignments", tags=["Assignments & Practice Quests"])


# --- Schemas ---

class CreateAssignmentRequest(BaseModel):
    quiz_id: Optional[str] = None
    title: str = Field(..., min_length=2, max_length=255, examples=["§22 Плотность вещества"])
    subject: str = Field("Физика", examples=["Физика"])
    grade: int = Field(7, ge=1, le=11)
    deadline_days: int = Field(3, ge=1, le=30)
    reward_acorns: int = Field(50, ge=10, le=500)
    reward_xp: int = Field(150, ge=20, le=1000)


class SubmitAssignmentRequest(BaseModel):
    score: int = Field(0, ge=0)
    accuracy_percent: int = Field(100, ge=0, le=100)


class ClaimDailyRequest(BaseModel):
    quest_id: str = Field(..., description="warmup | grove | quiz | chest")


# --- Auth Dependency ---

async def _get_current_user_from_header(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> UserModel:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Необходима авторизация (Bearer токен)",
        )
    token = authorization.split(" ")[1]
    payload = auth_service.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или истекший токен доступа",
        )
    p_id = payload.get("pseudonym_id")
    stmt = select(UserModel).where(UserModel.pseudonym_id == p_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )
    return user


# =============================================================================
# 1. ЕЖЕДНЕВНЫЕ КВЕСТЫ (DAILY QUESTS) С ПРИВЯЗКОЙ К БД
# =============================================================================

@router.get("/daily")
async def get_daily_quests(
    user: UserModel = Depends(_get_current_user_from_header),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Возвращает статус дейликов ученика на сегодняшнюю дату из SQLite."""
    today_str = date.today().isoformat()
    stmt = select(UserDailyQuestModel).where(
        UserDailyQuestModel.pseudonym_id == user.pseudonym_id,
        UserDailyQuestModel.date_str == today_str,
    )
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    if not record:
        # Проверяем, играл ли ученик сегодня в викторины
        from ..db.models import RoomParticipantModel
        quiz_played_today = False
        try:
            today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)
            q_cnt = await db.scalar(
                select(func.count(RoomParticipantModel.id)).where(
                    RoomParticipantModel.pseudonym_id == user.pseudonym_id,
                    RoomParticipantModel.joined_at >= today_start
                )
            )
            quiz_played_today = (q_cnt or 0) > 0
        except Exception:
            quiz_played_today = False

        record = UserDailyQuestModel(
            pseudonym_id=user.pseudonym_id,
            date_str=today_str,
            warmup_solved=False,
            warmup_claimed=False,
            grove_watered=False,
            grove_claimed=False,
            quiz_played=quiz_played_today,
            quiz_claimed=False,
            chest_claimed=False,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

    # Актуальный баланс желудей
    try:
        inv = grove_service.get_student_inventory(user.pseudonym_id)
        acorns = inv.get("acorns_balance", 50)
    except Exception:
        acorns = 50

    return {
        "status": "ok",
        "date": today_str,
        "streak_days": user.streak_days or 1,
        "acorns": acorns,
        "quests": {
            "warmup_solved": record.warmup_solved,
            "warmup_claimed": record.warmup_claimed,
            "grove_watered": record.grove_watered,
            "grove_claimed": record.grove_claimed,
            "quiz_played": record.quiz_played,
            "quiz_claimed": record.quiz_claimed,
            "chest_claimed": record.chest_claimed,
        },
        "daily_question": {
            "id": "warmup_daily",
            "subject": "Математика",
            "text": "Чему равна дробь 6/8, если сократить её до несократимой?",
            "options": ["3/4", "1/2", "2/3", "3/8"],
            "correct_index": 0,
            "explanation": "Делим числитель и знаменатель на 2: получаем 3/4!",
            "reward_acorns": 20,
            "reward_xp": 50,
        }
    }


@router.post("/daily/claim")
async def claim_daily_quest(
    req: ClaimDailyRequest,
    user: UserModel = Depends(_get_current_user_from_header),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Начисляет реальные желуди за выполнение дейлика и сохраняет отметку в SQLite."""
    today_str = date.today().isoformat()
    stmt = select(UserDailyQuestModel).where(
        UserDailyQuestModel.pseudonym_id == user.pseudonym_id,
        UserDailyQuestModel.date_str == today_str,
    )
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()
    if not record:
        record = UserDailyQuestModel(
            pseudonym_id=user.pseudonym_id,
            date_str=today_str,
        )
        db.add(record)

    acorns_delta = 0
    xp_delta = 0

    if req.quest_id == "warmup":
        if record.warmup_claimed:
            return {"status": "already_claimed", "message": "Награда уже получена"}
        record.warmup_solved = True
        record.warmup_claimed = True
        acorns_delta = 20
        xp_delta = 50
    elif req.quest_id == "grove":
        if record.grove_claimed:
            return {"status": "already_claimed", "message": "Награда уже получена"}
        record.grove_watered = True
        record.grove_claimed = True
        acorns_delta = 20
        xp_delta = 40
    elif req.quest_id == "quiz":
        if record.quiz_claimed:
            return {"status": "already_claimed", "message": "Награда уже получена"}
        record.quiz_played = True
        record.quiz_claimed = True
        acorns_delta = 35
        xp_delta = 100
    elif req.quest_id == "chest":
        if record.chest_claimed:
            return {"status": "already_claimed", "message": "Сундук уже открыт"}
        if not (record.warmup_claimed and record.grove_claimed and record.quiz_claimed):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Для открытия сундука выполните все 3 дейлика!",
            )
        record.chest_claimed = True
        acorns_delta = 50
        xp_delta = 200

    # Начисляем желуди в Grove
    try:
        grove_conn = grove_service._get_connection()
        with grove_conn:
            grove_conn.execute("""
                INSERT INTO student_gacha_state (student_id, acorns_balance, total_pulls)
                VALUES (?, ?, 0)
                ON CONFLICT(student_id) DO UPDATE SET acorns_balance = acorns_balance + ?
            """, (user.pseudonym_id, 50 + acorns_delta, acorns_delta))
    except Exception:
        pass

    await db.commit()

    inv = grove_service.get_student_inventory(user.pseudonym_id)
    new_acorns = inv.get("acorns_balance", 50)

    return {
        "status": "success",
        "acorns_awarded": acorns_delta,
        "xp_awarded": xp_delta,
        "total_acorns": new_acorns,
    }


# =============================================================================
# 2. РАБОТА НАД ОШИБКАМИ (РЕАЛЬНЫЕ ОШИБКИ ИЗ ПРОЙДЕННЫХ ВИКТОРИН)
# =============================================================================

@router.get("/mistakes")
async def get_student_mistakes(
    user: UserModel = Depends(_get_current_user_from_header),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Возвращает список РЕАЛЬНЫХ ошибок ученика из сыгранных викторин."""
    stmt = (
        select(SpacedRepetitionModel)
        .where(
            SpacedRepetitionModel.pseudonym_id == user.pseudonym_id,
            SpacedRepetitionModel.is_completed == False,  # noqa: E712
        )
        .order_by(desc(SpacedRepetitionModel.created_at))
        .limit(10)
    )
    res = await db.execute(stmt)
    mistakes = res.scalars().all()

    items = []
    for m in mistakes:
        raw_opts = m.options_json or []
        if isinstance(raw_opts, str):
            try:
                import json
                raw_opts = json.loads(raw_opts)
            except Exception:
                raw_opts = []
        opts = []
        corr_idx = 0
        if raw_opts:
            for i, o in enumerate(raw_opts):
                if isinstance(o, dict):
                    opts.append(o.get("text", str(o)))
                    if o.get("is_correct"):
                        corr_idx = i
                else:
                    opts.append(str(o))
        if not opts:
            opts = ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"]

        items.append({
            "id": m.id,
            "topic": m.topic,
            "question_text": m.question_text or "Задача на повторение",
            "options": opts,
            "correct_index": corr_idx,
            "explanation": m.explanation or f"Повторите тему: {m.topic}",
            "reward_acorns": 40,
            "reward_xp": 100,
            "created_at": m.created_at.isoformat() if m.created_at else datetime.now(timezone.utc).isoformat(),
        })

    return {
        "status": "ok",
        "count": len(items),
        "mistakes": items,
    }


@router.post("/mistakes/{mistake_id}/resolve")
async def resolve_mistake(
    mistake_id: int,
    user: UserModel = Depends(_get_current_user_from_header),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Отмечает ошибку как исправленную и начисляет +40 желудей в профиль."""
    stmt = select(SpacedRepetitionModel).where(
        SpacedRepetitionModel.id == mistake_id,
        SpacedRepetitionModel.pseudonym_id == user.pseudonym_id,
    )
    res = await db.execute(stmt)
    mistake = res.scalar_one_or_none()
    if not mistake:
        raise HTTPException(status_code=404, detail="Ошибка не найдена")

    mistake.is_completed = True

    # Начисление 40 желудей
    try:
        grove_conn = grove_service._get_connection()
        with grove_conn:
            grove_conn.execute("""
                INSERT INTO student_gacha_state (student_id, acorns_balance, total_pulls)
                VALUES (?, 90, 0)
                ON CONFLICT(student_id) DO UPDATE SET acorns_balance = acorns_balance + 40
            """, (user.pseudonym_id,))
    except Exception:
        pass

    await db.commit()

    inv = grove_service.get_student_inventory(user.pseudonym_id)
    return {
        "status": "success",
        "message": "Ошибка успешно исправлена! Очки возвращены в рейтинг.",
        "reward_acorns": 40,
        "total_acorns": inv.get("acorns_balance", 50),
    }


# =============================================================================
# 3. НАЗНАЧЕНИЕ И ВЫПОЛНЕНИЕ ЗАДАНИЙ УЧИТЕЛЯ (CLASS ASSIGNMENTS)
# =============================================================================

@router.post("/classes/{class_id}")
async def create_class_assignment(
    class_id: str,
    req: CreateAssignmentRequest,
    user: UserModel = Depends(_get_current_user_from_header),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Учитель назначает викторину в качестве домашнего задания классу."""
    # Проверка класса
    cls = await db.scalar(select(ClassModel).where(ClassModel.id == class_id))
    if not cls:
        raise HTTPException(status_code=404, detail="Класс не найден")

    asg = ClassAssignmentModel(
        class_id=class_id,
        teacher_pseudonym_id=user.pseudonym_id,
        quiz_id=req.quiz_id,
        title=req.title,
        subject=req.subject,
        grade=req.grade,
        deadline_days=req.deadline_days,
        reward_acorns=req.reward_acorns,
        reward_xp=req.reward_xp,
    )
    db.add(asg)
    await db.commit()
    await db.refresh(asg)

    # Оповещение в чат класса Сферума
    if cls.max_chat_id:
        try:
            bot_text = (
                f"📚 *Новое домашнее задание от учителя!*\n\n"
                f"🏷 *{asg.title}* ({asg.subject}, {asg.grade} класс)\n"
                f"⏰ Срок сдачи: {asg.deadline_days} дн.\n"
                f"🌰 Награда: +{asg.reward_acorns} желудей\n\n"
                f"Откройте Лисквиз во вкладке «Задания» для прохождения."
            )
            await max_bot_service.send_text_message(cls.max_chat_id, bot_text)
        except Exception:
            pass

    return {
        "status": "success",
        "assignment_id": asg.id,
        "title": asg.title,
        "class_name": cls.name,
    }


@router.get("/classes/{class_id}")
async def get_class_assignments(
    class_id: str,
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Возвращает все выданные задания для класса."""
    stmt = (
        select(ClassAssignmentModel)
        .where(ClassAssignmentModel.class_id == class_id)
        .order_by(desc(ClassAssignmentModel.created_at))
    )
    res = await db.execute(stmt)
    assignments = res.scalars().all()

    items = []
    for a in assignments:
        completed_count = len(a.submissions) if a.submissions else 0
        items.append({
            "id": a.id,
            "title": a.title,
            "subject": a.subject,
            "grade": a.grade,
            "deadline_days": a.deadline_days,
            "reward_acorns": a.reward_acorns,
            "reward_xp": a.reward_xp,
            "completed_students_count": completed_count,
            "created_at": a.created_at.isoformat(),
        })
    return items


@router.get("/my")
async def get_my_assignments(
    user: UserModel = Depends(_get_current_user_from_header),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Возвращает реальные домашние задания от учителя для текущего ученика."""
    # Находим класс ученика
    membership = await db.scalar(
        select(ClassStudentModel).where(ClassStudentModel.pseudonym_id == user.pseudonym_id)
    )
    if not membership:
        # Если ученик не в классе, отдаем демо-задание или пустой список
        return {
            "status": "ok",
            "class_name": None,
            "assignments": [],
        }

    class_id = membership.class_id
    cls = await db.scalar(select(ClassModel).where(ClassModel.id == class_id))

    stmt = (
        select(ClassAssignmentModel)
        .where(ClassAssignmentModel.class_id == class_id)
        .order_by(desc(ClassAssignmentModel.created_at))
    )
    res = await db.execute(stmt)
    assignments = res.scalars().all()

    # Сданные работы ученика
    subs_stmt = select(StudentAssignmentSubmissionModel).where(
        StudentAssignmentSubmissionModel.pseudonym_id == user.pseudonym_id
    )
    subs_res = await db.execute(subs_stmt)
    submissions_by_asg = {s.assignment_id: s for s in subs_res.scalars().all()}

    items = []
    for a in assignments:
        sub = submissions_by_asg.get(a.id)
        items.append({
            "id": a.id,
            "title": a.title,
            "subject": a.subject,
            "grade": a.grade,
            "deadline_days": a.deadline_days,
            "reward_acorns": a.reward_acorns,
            "reward_xp": a.reward_xp,
            "quiz_id": a.quiz_id,
            "is_completed": bool(sub and sub.is_completed),
            "score": sub.score if sub else None,
            "accuracy_percent": sub.accuracy_percent if sub else None,
            "created_at": a.created_at.isoformat(),
        })

    return {
        "status": "ok",
        "class_name": cls.name if cls else "5А",
        "assignments": items,
    }


@router.post("/{assignment_id}/submit")
async def submit_assignment(
    assignment_id: str,
    req: SubmitAssignmentRequest,
    user: UserModel = Depends(_get_current_user_from_header),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Ученик сдает выполненное домашнее задание, получая баллы и желуди."""
    asg = await db.scalar(select(ClassAssignmentModel).where(ClassAssignmentModel.id == assignment_id))
    if not asg:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    existing = await db.scalar(
        select(StudentAssignmentSubmissionModel).where(
            StudentAssignmentSubmissionModel.assignment_id == assignment_id,
            StudentAssignmentSubmissionModel.pseudonym_id == user.pseudonym_id,
        )
    )
    if existing:
        return {"status": "already_submitted", "message": "Задание уже сдано ранее"}

    sub = StudentAssignmentSubmissionModel(
        assignment_id=assignment_id,
        pseudonym_id=user.pseudonym_id,
        score=req.score,
        accuracy_percent=req.accuracy_percent,
        is_completed=True,
    )
    db.add(sub)

    # Начисляем награду за сдачу
    try:
        grove_conn = grove_service._get_connection()
        with grove_conn:
            grove_conn.execute("""
                INSERT INTO student_gacha_state (student_id, acorns_balance, total_pulls)
                VALUES (?, ?, 0)
                ON CONFLICT(student_id) DO UPDATE SET acorns_balance = acorns_balance + ?
            """, (user.pseudonym_id, 50 + asg.reward_acorns, asg.reward_acorns))
    except Exception:
        pass

    await db.commit()

    inv = grove_service.get_student_inventory(user.pseudonym_id)
    return {
        "status": "success",
        "message": "Задание успешно сдано!",
        "reward_acorns": asg.reward_acorns,
        "total_acorns": inv.get("acorns_balance", 50),
    }
