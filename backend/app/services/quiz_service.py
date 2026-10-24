import json
import os
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import select, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import QuizModel, QuestionModel, AnswerOptionModel


PRESETS_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "src", "services", "textbook_presets.json")
)


def _serialize_quiz(quiz_obj: QuizModel) -> Dict[str, Any]:
    return {
        "id": quiz_obj.id,
        "title": quiz_obj.title,
        "subject": quiz_obj.subject,
        "grade": quiz_obj.grade,
        "topic": quiz_obj.topic,
        "group_label": quiz_obj.group_label,
        "teacher_pseudonym_id": quiz_obj.teacher_pseudonym_id,
        "is_verified": quiz_obj.is_verified,
        "created_at": quiz_obj.created_at.isoformat() if quiz_obj.created_at else None,
        "questions": [
            {
                "id": q.id,
                "text": q.text,
                "explanation": q.explanation or "",
                "time_limit_sec": q.time_limit_sec,
                "tier": q.tier,
                "is_boss": q.is_boss,
                "topic": q.topic or quiz_obj.topic,
                "options": [
                    {
                        "id": o.id,
                        "text": o.text,
                        "is_correct": o.is_correct,
                        "symbol": o.symbol,
                        "color": o.color,
                    }
                    for o in (q.options or [])
                ],
            }
            for q in (quiz_obj.questions or [])
        ],
    }


async def seed_default_presets(db: AsyncSession) -> int:
    """Заполняет базу данных реальными проверенными шаблонами викторин из каталога учебников."""
    count_stmt = select(QuizModel.id).where(QuizModel.is_verified == True)
    existing = (await db.execute(count_stmt)).scalars().all()
    if len(existing) > 0:
        return len(existing)

    if not os.path.exists(PRESETS_FILE):
        return 0

    try:
        with open(PRESETS_FILE, "r", encoding="utf-8") as f:
            presets = json.load(f)
    except Exception as e:
        print(f"Error loading presets file: {e}")
        return 0

    seeded = 0
    for p in presets:
        quiz_id = p.get("id") or f"quiz_{uuid.uuid4().hex[:8]}"
        quiz_model = QuizModel(
            id=quiz_id,
            title=p.get("title", "Викторина"),
            subject=p.get("subject", "Математика"),
            grade=int(p.get("grade", 7)),
            topic=p.get("topic", "Школьная программа"),
            group_label=p.get("group_label"),
            teacher_pseudonym_id=None,
            is_verified=True,
        )
        db.add(quiz_model)
        await db.flush()

        for idx, q_data in enumerate(p.get("questions", [])):
            q_model = QuestionModel(
                quiz_id=quiz_id,
                order_index=idx,
                text=q_data.get("text", ""),
                explanation=q_data.get("explanation", ""),
                time_limit_sec=int(q_data.get("time_limit_sec", 20)),
                tier=int(q_data.get("tier", 1)),
                is_boss=bool(q_data.get("is_boss", False)),
                topic=q_data.get("topic") or quiz_model.topic,
            )
            db.add(q_model)
            await db.flush()

            for opt_idx, opt_data in enumerate(q_data.get("options", [])):
                opt_model = AnswerOptionModel(
                    question_id=q_model.id,
                    text=opt_data.get("text", ""),
                    is_correct=bool(opt_data.get("is_correct", False)),
                    symbol=opt_data.get("symbol"),
                    color=opt_data.get("color"),
                )
                db.add(opt_model)

        seeded += 1

    await db.commit()
    return seeded


async def list_quizzes(
    db: AsyncSession,
    teacher_pseudonym_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Возвращает только реальные викторины, созданные учителем."""
    stmt = (
        select(QuizModel)
        .options(selectinload(QuizModel.questions).selectinload(QuestionModel.options))
        .order_by(QuizModel.created_at.desc())
    )
    if teacher_pseudonym_id and teacher_pseudonym_id != "teacher_host":
        stmt = stmt.where(
            or_(
                QuizModel.teacher_pseudonym_id == teacher_pseudonym_id,
                QuizModel.teacher_pseudonym_id == "teacher_host"
            )
        )
    elif teacher_pseudonym_id:
        stmt = stmt.where(QuizModel.teacher_pseudonym_id == teacher_pseudonym_id)
    else:
        stmt = stmt.where(QuizModel.teacher_pseudonym_id.isnot(None))

    result = await db.execute(stmt)
    quizzes = result.scalars().all()

    return [_serialize_quiz(q) for q in quizzes]


async def get_quiz_by_id(db: AsyncSession, quiz_id: str) -> Optional[Dict[str, Any]]:
    """Получает полную структуру викторины по ID из БД."""
    stmt = (
        select(QuizModel)
        .where(QuizModel.id == quiz_id)
        .options(selectinload(QuizModel.questions).selectinload(QuestionModel.options))
    )
    result = await db.execute(stmt)
    quiz_obj = result.scalar_one_or_none()
    if not quiz_obj:
        return None
    return _serialize_quiz(quiz_obj)


async def save_or_update_quiz(
    db: AsyncSession,
    quiz_data: Dict[str, Any],
    teacher_pseudonym_id: Optional[str] = "teacher_host",
) -> Dict[str, Any]:
    """Создает или обновляет викторину учителя прямо в базе данных."""
    quiz_id = quiz_data.get("id")

    quiz_model = None
    if quiz_id:
        stmt = (
            select(QuizModel)
            .where(QuizModel.id == quiz_id)
            .options(selectinload(QuizModel.questions).selectinload(QuestionModel.options))
        )
        quiz_model = (await db.execute(stmt)).scalar_one_or_none()

    if quiz_model:
        # Обновление существующей
        quiz_model.title = quiz_data.get("title", quiz_model.title)
        quiz_model.subject = quiz_data.get("subject", quiz_model.subject)
        quiz_model.grade = int(quiz_data.get("grade", quiz_model.grade))
        quiz_model.topic = quiz_data.get("topic", quiz_model.topic)
        quiz_model.group_label = quiz_data.get("group_label", quiz_model.group_label)
        if not quiz_model.teacher_pseudonym_id and teacher_pseudonym_id:
            quiz_model.teacher_pseudonym_id = teacher_pseudonym_id

        # Очищаем старые вопросы для чистой перезаписи
        for old_q in list(quiz_model.questions):
            await db.delete(old_q)
        await db.flush()
    else:
        # Создание новой
        if not quiz_id:
            quiz_id = f"quiz_{uuid.uuid4().hex[:8]}"
        quiz_model = QuizModel(
            id=quiz_id,
            title=quiz_data.get("title", "Новая викторина"),
            subject=quiz_data.get("subject", "Математика"),
            grade=int(quiz_data.get("grade", 7)),
            topic=quiz_data.get("topic", "Тема викторины"),
            group_label=quiz_data.get("group_label", "Мой тест"),
            teacher_pseudonym_id=teacher_pseudonym_id or "teacher_host",
            is_verified=False,
        )
        db.add(quiz_model)
        await db.flush()

    # Сохраняем вопросы и варианты ответов
    questions_data = quiz_data.get("questions", [])
    for idx, q_item in enumerate(questions_data):
        q_model = QuestionModel(
            quiz_id=quiz_model.id,
            order_index=idx,
            text=q_item.get("text", f"Вопрос {idx + 1}"),
            explanation=q_item.get("explanation", ""),
            time_limit_sec=int(q_item.get("time_limit_sec", 20)),
            tier=int(q_item.get("tier", 1)),
            is_boss=bool(q_item.get("is_boss", False)),
            topic=q_item.get("topic") or quiz_model.topic,
        )
        db.add(q_model)
        await db.flush()

        for opt_idx, opt_item in enumerate(q_item.get("options", [])):
            opt_model = AnswerOptionModel(
                question_id=q_model.id,
                text=opt_item.get("text", f"Вариант {opt_idx + 1}"),
                is_correct=bool(opt_item.get("is_correct", False)),
                symbol=opt_item.get("symbol"),
                color=opt_item.get("color"),
            )
            db.add(opt_model)

    await db.commit()
    # Загружаем обновленный объект
    return await get_quiz_by_id(db, quiz_model.id)


async def delete_quiz(
    db: AsyncSession,
    quiz_id: str,
    teacher_pseudonym_id: Optional[str] = None,
) -> bool:
    """Удаляет викторину из базы данных."""
    stmt = select(QuizModel).where(QuizModel.id == quiz_id)
    quiz_obj = (await db.execute(stmt)).scalar_one_or_none()
    if not quiz_obj:
        return False

    await db.delete(quiz_obj)
    await db.commit()
    return True
