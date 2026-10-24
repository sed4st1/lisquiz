"""
Authentication Router (Lisquiz 2.0)
====================================
- Эмуляция команды /start от бота платформы MAX (Сферум).
- Обмен тикета или initData на подписанный JWT access token.
- Быстрый переключатель профилей для демонстрации и разработки.
- Проверка текущего пользователя через GET /api/auth/me.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..services.auth_service import auth_service
from ..services.max_bot_service import max_bot_service

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Session"])


class BotSimulateStartRequest(BaseModel):
    command: str = Field("/start", description="Команда боту (/start, /quiz <PIN>)")
    role: str = Field("teacher", description="Роль: teacher | student")
    name: str = Field("Ангелина Валерьевна", description="Имя пользователя в Сферуме")
    raw_user_id: Optional[str] = Field(None, description="Внешний ID пользователя в платформе MAX")
    avatar: Optional[str] = Field("fox_smart", description="Код аватара")


class ExchangeTicketRequest(BaseModel):
    ticket: Optional[str] = Field(None, description="Одноразовый тикет из ссылки /start (?ticket=...)")
    init_data: Optional[str] = Field(None, description="Параметры initData из Sferum WebView")
    quick_role: Optional[str] = Field(None, description="Быстрый вход для тестов: teacher | student")
    name: Optional[str] = Field(None, description="Имя для быстрого входа")
    avatar: Optional[str] = Field(None, description="Аватар для быстрого входа")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


async def get_current_user_payload(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Зависимость для извлечения пользователя из JWT заголовка Authorization: Bearer <token>."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Необходима авторизация (Bearer токен)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ")[1]
    payload = auth_service.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или истекший токен доступа",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


@router.post("/bot/simulate-start")
async def simulate_bot_start(
    req: BotSimulateStartRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Эмуляция команды /start от бота платформы MAX.
    Генерирует одноразовый тикет и карточку запуска викторины.
    Позволяет разрабатывать и тестировать авторизацию БЕЗ ожидания токена от организаторов!
    """
    raw_uid = req.raw_user_id or f"dev_user_{req.role}_{req.name.replace(' ', '_')}"
    pid = auth_service.get_pseudonym_id(raw_uid)

    ticket = await auth_service.create_auth_ticket(
        session=db,
        pseudonym_id=pid,
        role=req.role,
        display_name=req.name,
        avatar=req.avatar or "fox_smart",
        ttl_minutes=15,
    )

    launch_url = f"/?ticket={ticket.ticket}&role={req.role}"

    return {
        "status": "ok",
        "bot_configured": max_bot_service.is_configured(),
        "ticket": ticket.ticket,
        "launch_url": launch_url,
        "pseudonym_id": pid,
        "bot_message": (
            f"🦊 Привет от Спринта, {req.name}! "
            f"Ваш профиль готов. Нажмите кнопку ниже для бесшовного входа в Лисквиз."
        ),
        "button_text": "🚀 Открыть Лисквиз",
    }


@router.post("/exchange", response_model=TokenResponse)
async def exchange_auth(
    req: ExchangeTicketRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Обмен тикета /start, initData или быстрого dev-входа на полноценный JWT сессии.
    """
    # 1. Обмен по одноразовому тикету от бота
    if req.ticket:
        user = await auth_service.consume_auth_ticket(db, req.ticket)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Тикет входа недействителен, уже использован или истек",
            )
        token_data = {
            "sub": user.id,
            "pseudonym_id": user.pseudonym_id,
            "role": user.role,
            "name": user.display_name,
            "avatar": user.avatar,
        }
        token = auth_service.create_access_token(token_data)
        return TokenResponse(
            access_token=token,
            user={
                "id": user.id,
                "pseudonym_id": user.pseudonym_id,
                "role": user.role,
                "display_name": user.display_name,
                "avatar": user.avatar,
                "auth_provider": user.auth_provider,
            },
        )

    # 2. Обмен по initData от WebView Сферума
    if req.init_data:
        validate_res = max_bot_service.validate_init_data(req.init_data)
        if not validate_res.get("valid"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=validate_res.get("error", "Неверная цифровая подпись initData"),
            )
        user_info = validate_res.get("user", {})
        pid = validate_res.get("pseudonym_id") or "pid_guest"
        first_name = user_info.get("first_name", "Участник")

        user = await auth_service.get_or_create_user(
            session=db,
            pseudonym_id=pid,
            role=req.quick_role or "student",
            display_name=first_name,
            avatar=req.avatar or "fox_smart",
            auth_provider="max_bot",
        )
        token_data = {
            "sub": user.id,
            "pseudonym_id": user.pseudonym_id,
            "role": user.role,
            "name": user.display_name,
            "avatar": user.avatar,
        }
        token = auth_service.create_access_token(token_data)
        return TokenResponse(
            access_token=token,
            user={
                "id": user.id,
                "pseudonym_id": user.pseudonym_id,
                "role": user.role,
                "display_name": user.display_name,
                "avatar": user.avatar,
                "auth_provider": user.auth_provider,
            },
        )

    # 3. Быстрый Dev-вход (1 клик для переключения учитель/ученик)
    role = req.quick_role or "teacher"
    default_name = "Ангелина Валерьевна" if role == "teacher" else "Иван К."
    default_avatar = "fox_smart" if role == "teacher" else "raccoon"
    name = req.name or default_name
    avatar = req.avatar or default_avatar
    pid = auth_service.get_pseudonym_id(f"dev_{role}_{name.replace(' ', '_')}")

    user = await auth_service.get_or_create_user(
        session=db,
        pseudonym_id=pid,
        role=role,
        display_name=name,
        avatar=avatar,
        auth_provider="dev_emulator",
    )
    token_data = {
        "sub": user.id,
        "pseudonym_id": user.pseudonym_id,
        "role": user.role,
        "name": user.display_name,
        "avatar": user.avatar,
    }
    token = auth_service.create_access_token(token_data)
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "pseudonym_id": user.pseudonym_id,
            "role": user.role,
            "display_name": user.display_name,
            "avatar": user.avatar,
            "auth_provider": user.auth_provider,
        },
    )


@router.get("/me")
async def get_current_user_profile(
    payload: Dict[str, Any] = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    """
    Получение профиля текущего авторизованного пользователя из БД.
    """
    pid = payload.get("pseudonym_id")
    from sqlalchemy import select
    from ..db.models import UserModel

    stmt = select(UserModel).where(UserModel.pseudonym_id == pid)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        return {
            "id": payload.get("sub"),
            "pseudonym_id": pid,
            "role": payload.get("role", "student"),
            "display_name": payload.get("name", "Участник"),
            "avatar": payload.get("avatar", "fox_smart"),
            "auth_provider": "jwt_stateless",
        }

    return {
        "id": user.id,
        "pseudonym_id": user.pseudonym_id,
        "role": user.role,
        "display_name": user.display_name,
        "avatar": user.avatar,
        "auth_provider": user.auth_provider,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
    }
