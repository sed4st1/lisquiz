"""
Authentication & Zero-PII User Service (Lisquiz 2.0)
=====================================================
- 152-ФЗ Zero-PII: псевдонимизация пользователей через HMAC-SHA256 (без сохранения реальных телефонов/ФИО).
- Двухрежимная авторизация:
  1. Режим эмулятора бота (пока нет токена от платформы MAX): мгновенный вход /start через тикеты или быстрый вход.
  2. Продакшн-режим: живой бот MAX / Сферум шлет команду /start и формирует тикет/кнопку с deep-link.
- Выдача подписанных JWT Access Tokens (HS256).
"""

import hmac
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db.models import UserModel, AuthTicketModel
from .max_bot_service import max_bot_service


class AuthService:
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_days = 14

    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Создание подписанного JWT токена доступа."""
        to_encode = data.copy()
        now = datetime.now(timezone.utc)
        expire = now + (expires_delta or timedelta(days=self.access_token_expire_days))
        to_encode.update({
            "exp": expire,
            "iat": now,
        })
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def decode_access_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Проверка и декодирование JWT токена."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except (jwt.PyJWTError, Exception):
            return None

    def get_pseudonym_id(self, raw_user_id: str) -> str:
        """Вычисление Zero-PII pseudonym_id по 152-ФЗ."""
        return max_bot_service.get_pseudonym_id(raw_user_id)

    async def get_or_create_user(
        self,
        session: AsyncSession,
        pseudonym_id: str,
        role: str,
        display_name: str,
        avatar: str = "fox_smart",
        auth_provider: str = "dev_emulator",
    ) -> UserModel:
        """Поиск или создание пользователя в PostgreSQL / SQLite."""
        stmt = select(UserModel).where(UserModel.pseudonym_id == pseudonym_id)
        result = await session.execute(stmt)
        user = result.scalars().first()

        if user:
            # Обновление времени последнего входа
            user.last_login_at = datetime.now(timezone.utc)
            if display_name and user.display_name != display_name:
                user.display_name = display_name
            if avatar and user.avatar != avatar:
                user.avatar = avatar
            await session.commit()
            await session.refresh(user)
            return user

        new_user = UserModel(
            id=f"usr_{uuid.uuid4().hex[:8]}",
            pseudonym_id=pseudonym_id,
            role=role,
            display_name=display_name,
            avatar=avatar,
            auth_provider=auth_provider,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            last_login_at=datetime.now(timezone.utc),
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        return new_user

    async def create_auth_ticket(
        self,
        session: AsyncSession,
        pseudonym_id: str,
        role: str,
        display_name: str,
        avatar: str = "fox_smart",
        ttl_minutes: int = 10,
    ) -> AuthTicketModel:
        """Создание одноразового тикета для входа из бота по команде /start."""
        ticket_code = f"tkt_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        ticket = AuthTicketModel(
            ticket=ticket_code,
            pseudonym_id=pseudonym_id,
            role=role,
            display_name=display_name,
            avatar=avatar,
            expires_at=now + timedelta(minutes=ttl_minutes),
            is_used=False,
            created_at=now,
        )
        session.add(ticket)
        await session.commit()
        await session.refresh(ticket)
        return ticket

    async def consume_auth_ticket(
        self,
        session: AsyncSession,
        ticket_code: str,
    ) -> Optional[UserModel]:
        """Погашение тикета и создание/возврат пользователя."""
        stmt = select(AuthTicketModel).where(AuthTicketModel.ticket == ticket_code)
        result = await session.execute(stmt)
        ticket = result.scalars().first()

        now = datetime.now(timezone.utc)
        if not ticket or ticket.is_used or (ticket.expires_at and ticket.expires_at.replace(tzinfo=timezone.utc) < now):
            return None

        # Помечаем использованным
        ticket.is_used = True

        user = await self.get_or_create_user(
            session=session,
            pseudonym_id=ticket.pseudonym_id,
            role=ticket.role,
            display_name=ticket.display_name,
            avatar=ticket.avatar,
            auth_provider="max_bot" if max_bot_service.is_configured() else "dev_emulator",
        )
        await session.commit()
        return user


auth_service = AuthService()
