"""Роутер управления школьными классами, инвайтами и долгосрочной аналитикой (152-ФЗ)."""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.services.auth_service import auth_service
from backend.app.services import class_service

router = APIRouter(prefix="/api/classes", tags=["Classes"])


# ==========================================
# Pydantic Schemas
# ==========================================

class CreateClassRequest(BaseModel):
    name: str = Field(..., description="Название класса, например '7А' или '8Б'")
    subject: str = Field(default="Математика", description="Предмет")
    grade: int = Field(default=7, ge=1, le=11, description="Класс обучения (1-11)")
    teacher_pseudonym_id: Optional[str] = Field(default=None, description="Zero-PII ID учителя")


class JoinClassRequest(BaseModel):
    invite_code: str = Field(..., description="Код приглашения, например '7A-X9K2'")
    pseudonym_id: Optional[str] = Field(default=None, description="Zero-PII ID ученика")


# ==========================================
# Auth Helper
# ==========================================

def get_current_user_pid(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Извлекает pseudonym_id из Bearer JWT-токена, если он передан."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    payload = auth_service.decode_access_token(token)
    return payload.get("pseudonym_id") if payload else None


# ==========================================
# Endpoints
# ==========================================

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_class_endpoint(
    req: CreateClassRequest,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Создает новый школьный класс и генерирует уникальный инвайт-код."""
    auth_pid = get_current_user_pid(authorization)
    teacher_pid = auth_pid or req.teacher_pseudonym_id or "teacher_host"

    cls_obj = await class_service.create_class(
        db=db,
        teacher_pseudonym_id=teacher_pid,
        name=req.name,
        subject=req.subject,
        grade=req.grade,
    )

    return {
        "status": "created",
        "class": {
            "id": cls_obj.id,
            "name": cls_obj.name,
            "subject": cls_obj.subject,
            "grade": cls_obj.grade,
            "invite_code": cls_obj.invite_code,
            "invite_url": f"/?join_class={cls_obj.invite_code}",
            "created_at": cls_obj.created_at.isoformat() if cls_obj.created_at else None,
        },
    }


@router.get("")
async def list_classes_endpoint(
    teacher_pseudonym_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает список классов учителя со статистикой участников."""
    auth_pid = get_current_user_pid(authorization)
    target_pid = teacher_pseudonym_id or auth_pid or "teacher_host"

    classes = await class_service.get_classes_by_teacher(db, target_pid)
    return {"classes": classes}


@router.get("/{class_id}")
async def get_class_endpoint(
    class_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Возвращает детальную информацию о классе."""
    cls_obj = await class_service.get_class_by_id(db, class_id)
    if not cls_obj:
        raise HTTPException(status_code=404, detail="Класс не найден")

    return {
        "id": cls_obj.id,
        "name": cls_obj.name,
        "subject": cls_obj.subject,
        "grade": cls_obj.grade,
        "invite_code": cls_obj.invite_code,
        "invite_url": f"/?join_class={cls_obj.invite_code}",
        "students_count": len(cls_obj.students),
        "rooms_count": len(cls_obj.rooms),
        "created_at": cls_obj.created_at.isoformat() if cls_obj.created_at else None,
    }


@router.post("/join")
async def join_class_endpoint(
    req: JoinClassRequest,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Привязывает ученика к классу по инвайт-коду."""
    auth_pid = get_current_user_pid(authorization)
    student_pid = auth_pid or req.pseudonym_id

    if not student_pid:
        raise HTTPException(
            status_code=400,
            detail="Не передан идентификатор ученика (pseudonym_id) или токен авторизации",
        )

    try:
        res = await class_service.join_class(
            db=db,
            invite_code=req.invite_code,
            pseudonym_id=student_pid,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{class_id}/leaderboard")
async def class_leaderboard_endpoint(
    class_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Возвращает накопительный лидерборд класса за все сыгранные викторины."""
    cls_obj = await class_service.get_class_by_id(db, class_id)
    if not cls_obj:
        raise HTTPException(status_code=404, detail="Класс не найден")

    leaderboard = await class_service.get_class_leaderboard(db, class_id)
    return {
        "class_id": class_id,
        "class_name": cls_obj.name,
        "subject": cls_obj.subject,
        "grade": cls_obj.grade,
        "total_students": len(leaderboard),
        "leaderboard": leaderboard,
    }


@router.get("/{class_id}/analytics")
async def class_analytics_endpoint(
    class_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает накопительную матрицу дефицитов класса (Class Gap Heatmap)
    и список адаптивных рекомендаций для Spaced Repetition (Уровень 2).
    """
    try:
        analytics = await class_service.get_class_gap_heatmap(db, class_id)
        return analytics
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
