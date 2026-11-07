"""
MAX Platform / Sferum Webhook & Auth Router (Lisquiz 2.0)
=========================================================
Эндпоинты интеграции с экосистемой Сферум / MAX:
- POST /api/max/webhook: приём вебхуков от бота платформы MAX.
- POST /api/max/auth/validate: валидация параметров запуска Mini App (initData).
- GET /api/max/status: проверка готовности интеграции с ботом.
"""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Request, Body
from pydantic import BaseModel, Field

from ..services.max_bot_service import max_bot_service
from ..config import settings

logger = logging.getLogger("lisquiz.routes_max")

router = APIRouter(prefix="/api/max", tags=["MAX Platform / Sferum"])


class InitDataValidateRequest(BaseModel):
    init_data: str = Field(..., description="Строка параметров запуска WebApp из Sferum WebView")


class BotSimulateCommandRequest(BaseModel):
    user_id: str = Field("user_123", description="ID пользователя в MAX")
    chat_id: str = Field("chat_456", description="ID диалога или чата класса")
    text: str = Field("/start", description="Текст сообщения или команды")


@router.get("/status")
async def get_max_status():
    """
    Проверка статуса подключения к платформе MAX (Сферум).
    """
    configured = max_bot_service.is_configured()
    return {
        "status": "ready" if configured else "waiting_token",
        "bot_configured": configured,
        "app_id": settings.MAX_APP_ID or None,
        "webhook_url": settings.MAX_WEBHOOK_URL or "/api/max/webhook",
        "security": "152-FZ Zero-PII Enabled (HMAC Pseudonymization)",
        "features": [
            "Fox Sprint mascot card generator",
            "Deep-link room launcher (/quiz <PIN>)",
            "Class Grove live status (/grove)",
            "Closed-loop Spaced Repetition queue"
        ]
    }


@router.post("/auth/validate")
async def validate_init_data(req: InitDataValidateRequest):
    """
    Валидация подписи initData из Sferum / MAX WebView по стандарту HMAC-SHA256.
    Возвращает безопасный pseudonym_id без сохранения персональных данных (152-ФЗ).
    """
    result = max_bot_service.validate_init_data(req.init_data)
    if not result.get("valid"):
        raise HTTPException(
            status_code=401,
            detail=result.get("error", "Недействительные параметры запуска mini app")
        )
    return result


@router.post("/webhook")
async def max_webhook(request: Request):
    """
    Прием входящих событий и сообщений от платформы MAX (вебхук бота).
    Поддерживает: bot_started, message_created, message_callback.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    logger.info(f"Получен MAX вебхук: {payload}")

    update_type = payload.get("update_type")

    # Обработка события bot_started (пользователь нажал кнопку Старт в боте)
    if update_type == "bot_started":
        chat_id = str(payload.get("chat_id") or payload.get("user", {}).get("user_id", ""))
        sender_id = str(payload.get("user", {}).get("user_id", chat_id))
        start_payload = str(payload.get("payload") or "").strip()
        if start_payload.startswith("quiz_") or start_payload.isdigit():
            pin = start_payload.replace("quiz_", "")
            res = await max_bot_service.handle_bot_command(sender_id, chat_id, f"/quiz {pin}")
        else:
            res = await max_bot_service.handle_bot_command(sender_id, chat_id, "/start")
        return {"ok": True, "event": "bot_started", "result": res}

    # Обработка callback нажатия кнопок
    if update_type == "message_callback":
        cb = payload.get("callback", {})
        sender_id = str(cb.get("user", {}).get("user_id", "guest"))
        msg = payload.get("message", {})
        chat_id = str(msg.get("recipient", {}).get("chat_id") or sender_id)
        cb_payload = str(cb.get("payload") or "").strip()
        if cb_payload:
            res = await max_bot_service.handle_bot_command(sender_id, chat_id, cb_payload)
            return {"ok": True, "event": "message_callback", "result": res}

    # Обработка обычных сообщений (message_created)
    message = payload.get("message", {})
    sender = message.get("sender", {})
    recipient = message.get("recipient", {})
    body = message.get("body", {})

    sender_id = str(sender.get("user_id") or payload.get("user_id", "guest"))
    chat_id = str(recipient.get("chat_id") or payload.get("chat_id", sender_id))
    text = str(body.get("text") or payload.get("text", "")).strip()

    # Авто-создание класса при получении сообщения из группового чата MAX / Сферум
    chat_title = (
        payload.get("chat", {}).get("title")
        or recipient.get("title")
        or payload.get("title")
        or ""
    )
    is_group = bool(
        payload.get("chat", {}).get("type") in ("group", "supergroup", "channel")
        or recipient.get("chat_type") in ("group", "supergroup", "channel")
        or (chat_id and sender_id and str(chat_id) != str(sender_id))
    )
    if is_group and chat_id and chat_title:
        try:
            from ..db.session import async_session_maker
            from ..services.class_service import get_class_by_chat_id, auto_create_class_for_chat
            async with async_session_maker() as session:
                existing_cls = await get_class_by_chat_id(session, chat_id)
                if not existing_cls:
                    teacher_pid = max_bot_service.get_pseudonym_id(sender_id)
                    await auto_create_class_for_chat(session, chat_id, chat_title, teacher_pid)
        except Exception as e:
            logger.warning(f"Notice auto-creating class from chat {chat_id}: {e}")

    if text:
        res = await max_bot_service.handle_bot_command(
            sender_id=sender_id,
            chat_id=chat_id,
            text=text
        )
        return {"ok": True, "result": res}

    return {"ok": True, "note": "No text message to process"}


@router.post("/simulate-command")
async def simulate_command(req: BotSimulateCommandRequest):
    """
    Тестовый эндпоинт для эмуляции команд бота (удобно для тестирования сценариев без токена).
    """
    res = await max_bot_service.handle_bot_command(
        sender_id=req.user_id,
        chat_id=req.chat_id,
        text=req.text
    )
    return {"status": "success", "result": res}
