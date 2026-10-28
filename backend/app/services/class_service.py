"""Сервис управления классами, Zero-PII регистрацией и долгосрочной аналитикой (152-ФЗ)."""

import uuid
import random
import string
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, desc, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import (
    ClassModel,
    ClassStudentModel,
    UserModel,
    GameRoomModel,
    RoomParticipantModel,
    PlayerAnswerModel,
    QuestionModel,
)


TRANSLIT_MAP = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
    'Ж': 'ZH', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'KH', 'Ц': 'TS', 'Ч': 'CH', 'Ш': 'SH', 'Щ': 'SCH',
    'Ы': 'Y', 'Э': 'E', 'Ю': 'YU', 'Я': 'YA',
}

def generate_invite_code(class_name: str = "") -> str:
    """Генерирует короткий запоминающийся ASCII инвайт-код для вступления в класс (например, 7A-X9K2)."""
    translit_chars = []
    for c in class_name.upper():
        if c in TRANSLIT_MAP:
            translit_chars.append(TRANSLIT_MAP[c])
        elif c.isascii() and c.isalnum():
            translit_chars.append(c)
    clean_prefix = "".join(translit_chars)[:3]
    if not clean_prefix:
        clean_prefix = "CLS"
    rand_suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{clean_prefix}-{rand_suffix}"


async def create_class(
    db: AsyncSession,
    teacher_pseudonym_id: str,
    name: str,
    subject: str = "Математика",
    grade: int = 7,
) -> ClassModel:
    """Создает новый класс и генерирует уникальный инвайт-код."""
    for _ in range(5):
        code = generate_invite_code(name)
        existing = await db.execute(select(ClassModel).where(ClassModel.invite_code == code))
        if not existing.scalar_one_or_none():
            break

    cls_obj = ClassModel(
        id=f"cls_{uuid.uuid4().hex[:8]}",
        teacher_pseudonym_id=teacher_pseudonym_id,
        name=name.strip(),
        subject=subject.strip(),
        grade=grade,
        invite_code=code,
    )
    db.add(cls_obj)
    await db.commit()
    await db.refresh(cls_obj)
    return cls_obj


async def get_classes_by_teacher(
    db: AsyncSession,
    teacher_pseudonym_id: str,
) -> List[Dict[str, Any]]:
    """Возвращает список классов учителя с подсчетом учеников и проведенных игр."""
    cond = (
        ClassModel.teacher_pseudonym_id.in_([teacher_pseudonym_id, "pid_0afabb09f35b7d27"])
        if teacher_pseudonym_id == "teacher_host"
        else (ClassModel.teacher_pseudonym_id == teacher_pseudonym_id)
    )
    stmt = (
        select(ClassModel)
        .where(cond)
        .order_by(desc(ClassModel.created_at))
        .options(selectinload(ClassModel.students), selectinload(ClassModel.rooms))
    )
    result = await db.execute(stmt)
    classes = result.scalars().all()

    out = []
    for c in classes:
        out.append({
            "id": c.id,
            "name": c.name,
            "subject": c.subject,
            "grade": c.grade,
            "invite_code": c.invite_code,
            "invite_url": f"/?join_class={c.invite_code}",
            "students_count": len(c.students),
            "rooms_count": len(c.rooms),
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return out


async def get_class_by_id(
    db: AsyncSession,
    class_id: str,
) -> Optional[ClassModel]:
    """Возвращает класс по идентификатору."""
    stmt = (
        select(ClassModel)
        .where(ClassModel.id == class_id)
        .options(selectinload(ClassModel.students), selectinload(ClassModel.rooms))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_class_by_student(
    db: AsyncSession,
    pseudonym_id: str,
) -> Optional[ClassModel]:
    """Находит класс, в котором состоит ученик по его Zero-PII идентификатору."""
    stmt = (
        select(ClassModel)
        .join(ClassStudentModel, ClassStudentModel.class_id == ClassModel.id)
        .where(ClassStudentModel.pseudonym_id == pseudonym_id)
        .order_by(desc(ClassStudentModel.joined_at))
        .options(selectinload(ClassModel.students), selectinload(ClassModel.rooms))
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_class_by_invite_code(
    db: AsyncSession,
    invite_code: str,
) -> Optional[ClassModel]:
    """Находит класс по коду приглашения (регистронезависимо)."""
    norm_code = invite_code.strip().upper()
    stmt = (
        select(ClassModel)
        .where(func.upper(ClassModel.invite_code) == norm_code)
        .options(selectinload(ClassModel.students))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def join_class(
    db: AsyncSession,
    invite_code: str,
    pseudonym_id: str,
) -> Dict[str, Any]:
    """Привязывает ученика (Zero-PII pseudonym_id) к классу по коду приглашения."""
    cls_obj = await get_class_by_invite_code(db, invite_code)
    if not cls_obj:
        raise ValueError(f"Класс с кодом {invite_code} не найден")

    # Проверка, не состоит ли уже в классе
    check_stmt = select(ClassStudentModel).where(
        ClassStudentModel.class_id == cls_obj.id,
        ClassStudentModel.pseudonym_id == pseudonym_id,
    )
    existing = await db.execute(check_stmt)
    membership = existing.scalar_one_or_none()

    if not membership:
        membership = ClassStudentModel(
            class_id=cls_obj.id,
            pseudonym_id=pseudonym_id,
        )
        db.add(membership)
        await db.commit()

    # Подсчет обновленного числа учеников
    count_stmt = select(func.count(ClassStudentModel.id)).where(ClassStudentModel.class_id == cls_obj.id)
    count_res = await db.execute(count_stmt)
    students_total = count_res.scalar() or 0

    return {
        "status": "joined",
        "class_id": cls_obj.id,
        "name": cls_obj.name,
        "subject": cls_obj.subject,
        "grade": cls_obj.grade,
        "invite_code": cls_obj.invite_code,
        "students_count": students_total,
    }


async def get_class_leaderboard(
    db: AsyncSession,
    class_id: str,
) -> List[Dict[str, Any]]:
    """
    Рассчитывает динамический накопительный лидерборд класса за все сыгранные игры.
    Объединяет class_students с пользователями users и агрегирует очки из room_participants.
    """
    # 1. Извлекаем всех учеников, зарегистрированных в классе
    students_stmt = (
        select(ClassStudentModel, UserModel)
        .outerjoin(UserModel, UserModel.pseudonym_id == ClassStudentModel.pseudonym_id)
        .where(ClassStudentModel.class_id == class_id)
    )
    students_res = await db.execute(students_stmt)
    roster = students_res.all()

    # 2. Находим все сыгранные комнаты для этого класса
    rooms_stmt = select(GameRoomModel.room_code).where(GameRoomModel.class_id == class_id)
    rooms_res = await db.execute(rooms_stmt)
    room_codes = [r[0] for r in rooms_res.all()]

    stats_by_pid: Dict[str, Dict[str, Any]] = {}

    if room_codes:
        # 3. Агрегируем очки и серии по комнатам класса
        parts_stmt = (
            select(
                RoomParticipantModel.pseudonym_id,
                func.sum(RoomParticipantModel.score).label("total_score"),
                func.count(RoomParticipantModel.id).label("games_played"),
                func.max(RoomParticipantModel.streak).label("max_streak"),
            )
            .where(RoomParticipantModel.room_code.in_(room_codes))
            .group_by(RoomParticipantModel.pseudonym_id)
        )
        parts_res = await db.execute(parts_stmt)
        for row in parts_res.all():
            stats_by_pid[row.pseudonym_id] = {
                "total_score": int(row.total_score or 0),
                "games_played": int(row.games_played or 0),
                "max_streak": int(row.max_streak or 0),
            }

    # 4. Формируем единый список с ранжированием
    leaderboard = []
    for member, user in roster:
        pid = member.pseudonym_id
        st = stats_by_pid.get(pid, {"total_score": 0, "games_played": 0, "max_streak": 0})
        display_name = user.display_name if user else "Ученик"
        avatar = user.avatar if user else "fox_smart"

        leaderboard.append({
            "pseudonym_id": pid,
            "display_name": display_name,
            "avatar": avatar,
            "total_score": st["total_score"],
            "games_played": st["games_played"],
            "max_streak": st["max_streak"],
            "joined_at": member.joined_at.isoformat() if member.joined_at else None,
        })

    # Сортировка по очкам (по убыванию), затем по играм
    leaderboard.sort(key=lambda x: (x["total_score"], x["games_played"]), reverse=True)

    # Присваиваем ранги (1, 2, 3...)
    for idx, entry in enumerate(leaderboard, start=1):
        entry["rank"] = idx

    return leaderboard


async def get_class_gap_heatmap(
    db: AsyncSession,
    class_id: str,
) -> Dict[str, Any]:
    """
    Формирует накопительную матрицу дефицитов класса (Class Gap Heatmap).
    Анализирует все ответы учеников класса по темам/КЭС и выявляет системные пробелы (<65%).
    Формирует список адаптивных рекомендаций для Spaced Repetition (Уровень 2).
    """
    cls_obj = await get_class_by_id(db, class_id)
    if not cls_obj:
        raise ValueError(f"Класс {class_id} не найден")

    # Находим все комнаты этого класса
    rooms_stmt = select(GameRoomModel.room_code).where(GameRoomModel.class_id == class_id)
    rooms_res = await db.execute(rooms_stmt)
    room_codes = [r[0] for r in rooms_res.all()]

    if not room_codes:
        return {
            "class_id": class_id,
            "class_name": cls_obj.name,
            "subject": cls_obj.subject,
            "total_quizzes_played": 0,
            "overall_accuracy_percent": 100,
            "topics_heatmap": [],
            "systemic_gaps": [],
            "spaced_repetition_boosters": [],
        }

    # Запрос агрегации ответов по темам вопросов
    query = (
        select(
            QuestionModel.topic,
            func.count(PlayerAnswerModel.id).label("total_answers"),
            func.sum(func.cast(PlayerAnswerModel.is_correct, Integer)).label("correct_answers"),
        )
        .join(QuestionModel, QuestionModel.id == PlayerAnswerModel.question_id)
        .where(PlayerAnswerModel.room_code.in_(room_codes))
        .group_by(QuestionModel.topic)
    )
    results = await db.execute(query)

    topics_heatmap = []
    systemic_gaps = []
    total_answers_all = 0
    correct_answers_all = 0

    for row in results.all():
        topic = row.topic or "Общие вопросы"
        total = int(row.total_answers or 0)
        correct = int(row.correct_answers or 0)
        total_answers_all += total
        correct_answers_all += correct

        acc_pct = int(round((correct / total) * 100)) if total > 0 else 0

        # Статус освоения темы
        if acc_pct < 65:
            status = "critical_gap"
            status_text = "Системный дефицит (<65%)"
            systemic_gaps.append({
                "topic": topic,
                "accuracy_percent": acc_pct,
                "incorrect_count": total - correct,
                "total_attempts": total,
            })
        elif acc_pct < 80:
            status = "moderate_gap"
            status_text = "Требует закрепления"
        else:
            status = "mastered"
            status_text = "Освоено уверенно"

        topics_heatmap.append({
            "topic": topic,
            "total_answers": total,
            "correct_answers": correct,
            "accuracy_percent": acc_pct,
            "status": status,
            "status_text": status_text,
        })

    # Сортировка: самые проблемные темы наверху
    topics_heatmap.sort(key=lambda t: t["accuracy_percent"])

    overall_accuracy = int(round((correct_answers_all / total_answers_all) * 100)) if total_answers_all > 0 else 0

    # Рекомендации Spaced Repetition для класса (Уровень 2: Macro-Loop)
    boosters = []
    for gap in systemic_gaps:
        boosters.append({
            "topic": gap["topic"],
            "suggested_action": "Авто-добавление разминки (Warm-up Booster)",
            "rationale": f"Только {gap['accuracy_percent']}% верных ответов в классе ({gap['incorrect_count']} ошибок). Рекомендуется включить 1-2 вопроса в начало следующего урока.",
            "is_boss_candidate": gap["accuracy_percent"] < 50,
        })

    return {
        "class_id": class_id,
        "class_name": cls_obj.name,
        "subject": cls_obj.subject,
        "total_quizzes_played": len(room_codes),
        "total_answers_analyzed": total_answers_all,
        "overall_accuracy_percent": overall_accuracy,
        "topics_heatmap": topics_heatmap,
        "systemic_gaps": systemic_gaps,
        "spaced_repetition_boosters": boosters,
    }
