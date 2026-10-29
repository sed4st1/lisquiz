"""
MAX Platform / Sferum Integration Service (Lisquiz 2.0)
======================================================
Архитектура интеграции с платформой MAX и Сферум:
1. Безопасность 152-ФЗ (Zero-PII контур): HMAC-SHA256 псевдонимизация пользователей.
2. Валидация подписи initData из WebView Сферума.
3. Обработка команд чат-бота лисёнка Спринта (/start, /quiz <PIN>, /grove, /stats).
4. Отправка интерактивных карточек с кнопками запуска Mini App в чат класса.
"""

import hmac
import hashlib
import json
import logging
import urllib.parse
from typing import Dict, Any, Optional, List
import httpx

from ..config import settings
from .room_state_engine import room_state_engine
from .grove_service import grove_service

logger = logging.getLogger("lisquiz.max_bot_service")


class MaxBotService:
    def __init__(self):
        self.bot_token = settings.MAX_BOT_TOKEN
        self.app_id = settings.MAX_APP_ID
        self.app_secret = settings.MAX_APP_SECRET
        self.api_base_url = "https://api.max.ru/v1"

    def is_configured(self) -> bool:
        """Проверка, задан ли токен бота MAX."""
        return bool(self.bot_token and len(self.bot_token.strip()) > 5)

    def get_pseudonym_id(self, max_user_id: str) -> str:
        """
        Псевдонимизация пользователей по 152-ФЗ (Zero-PII):
        PID = HMAC-SHA256(max_user_id, SECRET_KEY)[:16]
        Никакие реальные имена, телефоны или аккаунты не утекают в базу викторин.
        """
        secret = settings.SECRET_KEY.encode("utf-8")
        user_bytes = str(max_user_id).encode("utf-8")
        h = hmac.new(secret, user_bytes, hashlib.sha256).hexdigest()
        return f"pid_{h[:16]}"

    def validate_init_data(self, init_data_raw: str) -> Dict[str, Any]:
        """
        Валидация цифровой подписи initData от платформы MAX.
        Проверяет HMAC-SHA256 соответствие хэша переданным параметрам.
        """
        if not init_data_raw:
            return {"valid": False, "error": "Пустые initData"}

        # Если токен/секрет еще не задан в .env, разрешаем дев-режим
        if not self.app_secret and not self.bot_token:
            logger.info("MAX_BOT_TOKEN / MAX_APP_SECRET не заданы, пропуск валидации подписи в mock-режиме")
            try:
                parsed = dict(urllib.parse.parse_qsl(init_data_raw))
                user_obj = json.loads(parsed.get("user", "{}")) if "user" in parsed else {}
                uid = str(user_obj.get("id", "dev_user_1"))
                return {
                    "valid": True,
                    "is_mock": True,
                    "pseudonym_id": self.get_pseudonym_id(uid),
                    "user": user_obj
                }
            except Exception:
                return {"valid": True, "is_mock": True, "pseudonym_id": "pid_dev_guest", "user": {}}

        try:
            parsed = dict(urllib.parse.parse_qsl(init_data_raw, keep_blank_values=True))
            received_hash = parsed.pop("hash", None)
            if not received_hash:
                return {"valid": False, "error": "Отсутствует параметр hash"}

            # Сортировка ключей по алфавиту по спецификации MAX / WebApp
            data_check_arr = [f"{k}={v}" for k, v in sorted(parsed.items())]
            data_check_string = "\n".join(data_check_arr)

            secret_key = hashlib.sha256((self.app_secret or self.bot_token).encode("utf-8")).digest()
            calculated_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()

            if hmac.compare_digest(received_hash, calculated_hash):
                user_obj = json.loads(parsed.get("user", "{}")) if "user" in parsed else {}
                uid = str(user_obj.get("id", "anonymous"))
                return {
                    "valid": True,
                    "pseudonym_id": self.get_pseudonym_id(uid),
                    "user": user_obj,
                    "auth_date": parsed.get("auth_date")
                }
            else:
                return {"valid": False, "error": "Недействительная цифровая подпись"}
        except Exception as e:
            logger.error(f"Ошибка проверки initData MAX: {e}")
            return {"valid": False, "error": str(e)}

    async def handle_bot_command(self, sender_id: str, chat_id: str, text: str) -> Dict[str, Any]:
        """
        Диспетчер команд бота лисёнка Спринта:
        - /start: приветствие и главное меню
        - /quiz <PIN>: интерактивная карточка комнаты
        - /grove: сводка Классной Рощи
        - /stats: личная статистика ученика
        """
        cmd = text.strip()
        parts = cmd.split()
        root_cmd = parts[0].lower() if parts else "/start"

        pid = self.get_pseudonym_id(sender_id)

        app_base = (settings.MAX_WEBAPP_URL or "http://localhost:8000").rstrip("/")

        if root_cmd in ("/start", "старт", "привет"):
            reply_text = (
                "🦊 **Привет! Я лисёнок Спринт** — твой проводник в интерактивных экспресс-викторинах «Лисквиз» в Сферуме!\n\n"
                "С нами повторение тем превращается в командную игру:\n"
                "• Отвечай на вопросы викторины вместе с одноклассниками\n"
                "• Выращивай волшебную Классную Рощу общими усилиями\n"
                "• Собирай редкие карточки знаний в личный альбом\n\n"
                "Выбирай, с чего начнём 👇"
            )
            buttons = [
                [{"text": "🎮 Ввести PIN и играть", "type": "open_app", "url": f"{app_base}/"}],
                [{"text": "🌳 Наша Классная Роща", "type": "open_app", "url": f"{app_base}/"}],
                [{"text": "✨ Создать викторину (для учителя)", "type": "open_app", "url": f"{app_base}/"}],
            ]
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "/start", "status": "sent"}

        elif root_cmd in ("/quiz", "/game", "/pin", "квиз", "игра"):
            if len(parts) > 1:
                pin = parts[1].strip()
                room = await room_state_engine.get_room(pin)
                if room:
                    reply_text = (
                        f"🦊 **Викторина найдена!**\n\n"
                        f"📖 Тема: **{room.quiz.title}**\n"
                        f"🔢 ПИН-код: `{pin}`\n"
                        f"👥 В комнате уже: **{len(room.players)}** учеников\n\n"
                        "Жми кнопку ниже, чтобы мгновенно войти в викторину!"
                    )
                    buttons = [
                        [{"text": f"🚀 Присоединиться к игре ({pin})", "type": "open_app", "url": f"{app_base}/?pin={pin}"}]
                    ]
                else:
                    reply_text = (
                        f"🦊 Комната с PIN `{pin}` не найдена или уже завершена.\n"
                        "Уточни правильный 6-значный код у своего учителя!"
                    )
                    buttons = [
                        [{"text": "🎮 Ввести другой PIN", "type": "open_app", "url": f"{app_base}/"}]
                    ]
            else:
                reply_text = "🦊 Напиши команду с номером комнаты, например: `/quiz 482915`"
                buttons = []

            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "/quiz", "status": "sent"}

        elif root_cmd in ("/grove", "/роща", "роща", "/stats"):
            grove = grove_service.get_or_create_grove("test_class_5a")
            stage_info = grove.get("stage_info", {})
            liebig = grove.get("liebig", {})

            reply_text = (
                f"🌳 **Классная Роща (5-А класс)**\n\n"
                f"🌱 Стадия: **{stage_info.get('title', 'Семечко')}**\n"
                f"✨ Опыт класса: **{grove.get('total_xp', 0)} XP**\n"
                f"🔥 Стрик совместной активности: **{grove.get('streak_days', 1)} дн.**\n\n"
                f"**Баланс ресурсов (Закон Либиха):**\n"
                f"💧 Вода (Tier 1): {liebig.get('water_pct', 0)}%\n"
                f"🍂 Гумус (Tier 2): {liebig.get('humus_pct', 0)}%\n"
                f"☀️ Свет (Tier 3): {liebig.get('light_pct', 0)}%\n\n"
                f"💬 *Совет Спринта: {grove.get('mascot_advice', 'Сыграйте викторину сегодня!')}*"
            )
            buttons = [
                [{"text": "🌳 Открыть Рощу в приложении", "type": "open_app", "url": f"{app_base}/"}]
            ]
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "/grove", "status": "sent"}

        elif root_cmd in ("/class", "/join_class", "/класс", "класс"):
            if len(parts) > 1:
                code = parts[1].strip().upper()
                reply_text = (
                    f"🦊 **Приглашение в класс по коду `{code}`!**\n\n"
                    "Присоединяйся к классу в Лисквизе, чтобы твои победы шли в общий рейтинг класса и растили нашу Классную Рощу! 🌳"
                )
                buttons = [
                    [{"text": f"🎒 Вступить в класс ({code})", "type": "open_app", "url": f"{app_base}/?join_class={code}"}]
                ]
            else:
                reply_text = "🦊 Напиши команду с кодом класса, например: `/class 7A-X9K2`"
                buttons = []
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "/class", "status": "sent"}

        else:
            reply_text = (
                f"🦊 Лисёнок Спринт не знает команду `{cmd}`.\n"
                "Доступные команды:\n"
                "• `/start` — Главное меню\n"
                "• `/quiz <PIN>` — Подключиться к викторине\n"
                "• `/grove` — Проверить состояние Классной Рощи"
            )
            await self.send_message(chat_id, reply_text, [])
            return {"command": "unknown", "status": "sent"}

    async def send_message(self, chat_id: str, text: str, buttons: Optional[List[List[Dict[str, Any]]]] = None) -> bool:
        """
        Отправка сообщения пользователю/чату через MAX Bot API.
        При отсутствии токена работает в mock-режиме с подробным логированием.
        """
        if not self.is_configured():
            logger.info(
                f"[MAX MOCK SEND] To chat_id={chat_id}\n"
                f"Text: {text[:100]}...\n"
                f"Buttons: {buttons}"
            )
            return True

        url = f"{self.api_base_url}/messages"
        headers = {
            "Authorization": f"Bearer {self.bot_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "chat_id": chat_id,
            "text": text,
        }
        if buttons:
            payload["inline_keyboard"] = buttons

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (200, 201):
                    logger.info(f"Сообщение успешно отправлено в MAX чат {chat_id}")
                    return True
                else:
                    logger.error(f"Ошибка MAX Bot API ({resp.status_code}): {resp.text}")
                    return False
        except Exception as e:
            logger.error(f"Исключение при вызове MAX Bot API: {e}")
            return False


max_bot_service = MaxBotService()
