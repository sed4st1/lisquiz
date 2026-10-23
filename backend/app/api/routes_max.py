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
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    logger.info(f"Получен MAX вебхук: {payload}")

    # Извлечение параметров сообщения из типичной структуры MAX webhook
    message = payload.get("message", {})
    sender = message.get("sender", {})
    recipient = message.get("recipient", {})
    body = message.get("body", {})

    sender_id = str(sender.get("user_id") or payload.get("user_id", "guest"))
    chat_id = str(recipient.get("chat_id") or payload.get("chat_id", sender_id))
    text = str(body.get("text") or payload.get("text", "")).strip()

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
