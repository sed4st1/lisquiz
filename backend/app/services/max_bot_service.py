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
        self.api_base_url = "https://platform-api2.max.ru"
        self.bot_username = "ideya_fiks_131_bot"

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

    async def generate_pc_ticket(self, sender_id: str, display_name: str = "Учитель") -> str:
        """
        Генерация 6-значного одноразового кода для входа на школьном ПК/проекторе (TTL: 5 минут).
        Сохраняет тикет в auth_tickets с ролью teacher и псевдонимом учителя.
        """
        import secrets
        from datetime import datetime, timedelta, timezone
        from ..db.session import async_session_maker
        from ..db.models import AuthTicketModel

        pin_code = f"{secrets.randbelow(1000):03d}-{secrets.randbelow(1000):03d}"
        pid = self.get_pseudonym_id(sender_id)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=5)

        async with async_session_maker() as session:
            ticket = AuthTicketModel(
                ticket=pin_code,
                pseudonym_id=pid,
                role="teacher",
                display_name=display_name,
                avatar="owl",
                expires_at=expires_at,
                is_used=False,
                created_at=now
            )
            session.add(ticket)
            await session.commit()

        logger.info(f"Сгенерирован OTP тикет {pin_code} для учителя PID {pid}")
        return pin_code

    async def handle_bot_command(self, sender_id: str, chat_id: str, text: str) -> Dict[str, Any]:
        """
        Диспетчер команд и кнопок бота лисёнка Спринта:
        - /start, menu_main: главное меню с кнопками запуска MiniApp, ПК-кода и FAQ
        - get_pc_code, /pc: генерация одноразового 6-значного кода для школьного ПК
        - faq_menu: интерактивный раздел помощи с темами
        - /quiz <PIN>: интерактивная карточка комнаты
        - /grove: сводка Классной Рощи
        - /class <CODE>: приглашение в класс
        """
        cmd = text.strip()
        parts = cmd.split()
        root_cmd = parts[0].lower() if parts else "/start"

        app_base = (settings.MAX_WEBAPP_URL or "https://lisquiz.daniel.crazedns.ru").rstrip("/")

        # 1. Главное меню (/start, menu_main)
        if root_cmd in ("/start", "старт", "привет", "menu_main"):
            reply_text = (
                "🦊 **Привет! Я лисёнок Спринт** — твой проводник в интерактивных экспресс-викторинах «Лисквиз» в Сферуме!\n\n"
                "Школьные викторины нового поколения прямо внутри MAX:\n"
                "• 🚀 Мгновенные квизы по программе ФРП РФ\n"
                "• 🌳 Волшебная Классная Роща, растущая от ответов класса\n"
                "• 🔒 Безопасность 152-ФЗ Zero-PII (без сбора личных данных)\n"
                "• 💻 Вход для учителя на школьном ПК за 3 секунды\n\n"
                "Выберите действие ниже 👇"
            )
            buttons = [
                [{"text": "🚀 Открыть Лисквиз (MAX App)", "type": "open_app"}],
                [{"text": "🌐 Открыть в браузере", "type": "link", "url": f"{app_base}/"}],
                [{"text": "💻 Вход на школьном ПК (Код)", "type": "callback", "payload": "get_pc_code"}],
                [{"text": "❓ FAQ / Справка", "type": "callback", "payload": "faq_menu"}]
            ]
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "/start", "status": "sent"}

        # 2. Генерация одноразового кода для входа на ПК учителя (get_pc_code, /pc, /code)
        elif root_cmd in ("get_pc_code", "/pc", "/code", "/connect", "код", "пк", "войти"):
            code = await self.generate_pc_ticket(sender_id)
            reply_text = (
                "💻 **Ваш одноразовый код для входа на школьном ПК / проекторе:**\n\n"
                f"🔑 `{code}`\n\n"
                "⏱ **Код действует 5 минут (одноразовый)**\n\n"
                "**Как войти на уроке:**\n"
                f"1. Откройте в браузере на интерактивной доске:\n👉 {app_base}/\n"
                f"2. Нажмите **«Вход для учителя»** и введите этот код: `{code}`\n"
                "3. Компьютер мгновенно привяжется к вашему кабинету со всеми вашими классами!"
            )
            buttons = [
                [{"text": "🔄 Сгенерировать новый код", "type": "callback", "payload": "get_pc_code"}],
                [{"text": "◀️ В главное меню", "type": "callback", "payload": "menu_main"}]
            ]
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "get_pc_code", "status": "sent", "code": code}

        # 3. Главное меню FAQ (faq_menu, /faq, /help, помощь, справка)
        elif root_cmd in ("faq_menu", "/faq", "/help", "помощь", "справка", "faq"):
            reply_text = (
                "❓ **Часто задаваемые вопросы (FAQ) по Лисквиз:**\n\n"
                "Выберите нужный вопрос, чтобы быстро узнать ответ 👇"
            )
            buttons = [
                [{"text": "✨ Как создать викторину с ИИ?", "type": "callback", "payload": "faq_quiz"}],
                [{"text": "🏫 Как подключить класс и учеников?", "type": "callback", "payload": "faq_classes"}],
                [{"text": "🖥 Как запустить игру на проекторе?", "type": "callback", "payload": "faq_projector"}],
                [{"text": "🌳 Что такое Классная Роща?", "type": "callback", "payload": "faq_grove"}],
                [{"text": "🔒 Безопасность и 152-ФЗ (Zero-PII)", "type": "callback", "payload": "faq_security"}],
                [{"text": "◀️ В главное меню", "type": "callback", "payload": "menu_main"}]
            ]
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "faq_menu", "status": "sent"}

        # 3.1 FAQ: Генерация викторины
        elif root_cmd == "faq_quiz":
            reply_text = (
                "✨ **Как создать викторину с ИИ за 30 секунд:**\n\n"
                "1. Войдите как учитель в приложении или на ПК через одноразовый код.\n"
                "2. Выберите предмет, класс и тему урока из официального каталога ФРП РФ.\n"
                "3. Или прикрепите фото конспекта / параграфа учебника.\n"
                "4. Нажмите **«Создать с ИИ»** — нейросеть Сбер GigaChat создаст 4 варианта ответов с методическими объяснениями и босс-вопросом.\n"
                "5. Нажмите «Начать викторину» — дети подключаются за секунды!"
            )
            buttons = [
                [{"text": "🚀 Открыть Лисквиз", "type": "open_app"}],
                [{"text": "◀️ Назад в FAQ", "type": "callback", "payload": "faq_menu"}],
                [{"text": "🏠 Главное меню", "type": "callback", "payload": "menu_main"}]
            ]
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "faq_quiz", "status": "sent"}

        # 3.2 FAQ: Подключение класса
        elif root_cmd == "faq_classes":
            reply_text = (
                "🏫 **Как подключить класс и учеников:**\n\n"
                "1. В кабинете учителя перейдите во вкладку **«Классы»** и создайте класс (например, 7А Математика).\n"
                "2. Скопируйте **код приглашения** (например, `7A-MATH`) или ссылку.\n"
                "3. Отправьте ссылку в чат класса в Сферуме/MAX.\n"
                "4. Ученики нажимают на ссылку и автоматически прикрепляются к вашему классу под безопасными псевдонимами!"
            )
            buttons = [
                [{"text": "🚀 Открыть Лисквиз", "type": "open_app"}],
                [{"text": "◀️ Назад в FAQ", "type": "callback", "payload": "faq_menu"}]
            ]
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "faq_classes", "status": "sent"}

        # 3.3 FAQ: Запуск на проекторе
        elif root_cmd == "faq_projector":
            reply_text = (
                "🖥 **Как запустить викторину на интерактивной доске или проекторе:**\n\n"
                f"1. Откройте в браузере школьного ПК: {app_base}/\n"
                "2. В этом боте нажмите кнопку **«💻 Вход на школьном ПК»** и введите полученный 6-значный код на экране доски.\n"
                "3. Запустите викторину — на проекторе появится большой PIN-код и QR-код.\n"
                "4. Ученики наводят камеру телефона на QR-код и мгновенно подключаются к игре прямо в MAX без ввода логинов и паролей!"
            )
            buttons = [
                [{"text": "💻 Получить код для ПК прямо сейчас", "type": "callback", "payload": "get_pc_code"}],
                [{"text": "◀️ Назад в FAQ", "type": "callback", "payload": "faq_menu"}]
            ]
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "faq_projector", "status": "sent"}

        # 3.4 FAQ: Классная Роща
        elif root_cmd == "faq_grove":
            reply_text = (
                "🌳 **Что такое Классная Роща:**\n\n"
                "Классная Роща — это живое командное дерево вашего класса:\n"
                "• За каждый правильный ответ ученики собирают капли Воды, Гумус и Солнечный свет.\n"
                "• Дерево растёт по **закону Либиха**: нужны успехи как отличников (сложные вопросы), так и ребят, подтягивающих базу.\n"
                "• Вместе класс открывает новые стадии дерева (от Семечка до Векового Дуба) и коллекционирует лесные карточки!"
            )
            buttons = [
                [{"text": "🌳 Посмотреть статус Рощи", "type": "callback", "payload": "/grove"}],
                [{"text": "◀️ Назад в FAQ", "type": "callback", "payload": "faq_menu"}]
            ]
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "faq_grove", "status": "sent"}

        # 3.5 FAQ: Безопасность 152-ФЗ
        elif root_cmd == "faq_security":
            reply_text = (
                "🔒 **Безопасность и соответствие 152-ФЗ (Zero-PII):**\n\n"
                "Мы строго защищаем персональные данные детей и учителей:\n"
                "• Платформа **не собирает и не хранит** реальные ФИО, номера телефонов или паспортные данные.\n"
                "• Все аккаунты псевдонимизируются через криптографический HMAC-SHA256 с солью.\n"
                "• На экране отображаются только дружелюбные игровые имена (например, «Иван К.» или «Ёжик»).\n"
                "• Данные изолированы: каждый учитель видит только свои классы, ученики не видят чужие ответы."
            )
            buttons = [
                [{"text": "🚀 Открыть Лисквиз", "type": "open_app"}],
                [{"text": "◀️ Назад в FAQ", "type": "callback", "payload": "faq_menu"}]
            ]
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "faq_security", "status": "sent"}

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

        elif root_cmd in ("/class", "/connect", "/join_class", "/класс", "класс"):
            if len(parts) > 1:
                code = parts[1].strip().upper()
                from ..db.session import async_session_maker
                from .class_service import connect_chat_to_class
                async with async_session_maker() as session:
                    cls_obj = await connect_chat_to_class(session, code, chat_id)
                if cls_obj:
                    reply_text = (
                        f"🌳 **Чат успешно подключён к классу «{cls_obj.name}»!**\n\n"
                        f"• Предмет: **{cls_obj.subject}** ({cls_obj.grade} класс)\n"
                        f"• Код приглашения: `{cls_obj.invite_code}`\n\n"
                        "Теперь все результаты викторин, домашняя работа над ошибками и полив Классной Рощи будут автоматически приходить прямо в этот чат!"
                    )
                    buttons = [
                        [{"text": f"🚀 Открыть Лисквиз {cls_obj.name}", "type": "open_app", "url": f"{app_base}/?class_id={cls_obj.id}&role=student"}]
                    ]
                else:
                    reply_text = (
                        f"🦊 **Приглашение в класс по коду `{code}`!**\n\n"
                        "Присоединяйся к классу в Лисквизе, чтобы твои победы шли в общий рейтинг класса и растили нашу Классную Рощу! 🌳"
                    )
                    buttons = [
                        [{"text": f"🎒 Вступить в класс ({code})", "type": "open_app", "url": f"{app_base}/?join_class={code}"}]
                    ]
            else:
                reply_text = "🦊 Напишите команду с кодом класса, например: `/connect 7A-X9K2` или `/class 7A-X9K2`"
                buttons = []
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "/class", "status": "sent"}

        else:
            reply_text = (
                f"🦊 Лисёнок Спринт не знает команду `{cmd}`.\n\n"
                "Доступные команды:\n"
                "• `/start` — Главное меню\n"
                "• `/pc` — Получить код для входа на школьном ПК\n"
                "• `/faq` — Справка и ответы на вопросы\n"
                "• `/quiz <PIN>` — Подключиться к викторине\n"
                "• `/connect <КОД>` — Привязать этот чат к классу\n"
                "• `/grove` — Проверить состояние Классной Рощи"
            )
            buttons = [
                [{"text": "🏠 Главное меню", "type": "callback", "payload": "menu_main"}]
            ]
            await self.send_message(chat_id, reply_text, buttons)
            return {"command": "unknown", "status": "sent"}

    async def send_gap_report_to_chat(
        self,
        chat_id: str,
        quiz_title: str,
        topic: str,
        total_participants: int,
        accuracy_percent: int,
        acorns_earned: int,
        drops_earned: int,
        weak_topics: List[str],
        homework_rec: Optional[str] = None,
        room_code: Optional[str] = None
    ) -> bool:
        """Отправка структурированного отчета викторины в чат класса Сферума."""
        app_base = (settings.MAX_WEBAPP_URL or "https://lisquiz.daniel.crazedns.ru").rstrip("/")
        
        weak_str = "\n".join([f"• {t}" for t in weak_topics[:3]]) if weak_topics else "• Все ключевые концепции усвоены!"
        rec_str = f"\n\n💬 *Совет Спринта: {homework_rec}*" if homework_rec else ""
        
        text = (
            f"🦊 **Итоги викторины по теме «{quiz_title}»**\n\n"
            f"👥 Участников: **{total_participants}** учеников\n"
            f"🎯 Точность класса: **{accuracy_percent}%**\n"
            f"🌰 Заработано в копилку класса: **+{acorns_earned}** желудей\n"
            f"💧 Награда в Классную Рощу: **+{drops_earned}** капель воды\n\n"
            f"📌 **Темы для повторения:**\n{weak_str}"
            f"{rec_str}\n\n"
            "Карточки работы над ошибками уже ждут ребят в Лисквизе!"
        )
        
        buttons = [
            [{"text": "🚀 Открыть работу над ошибками", "type": "open_app", "url": f"{app_base}/?tab=home"}],
            [{"text": "🌳 Посмотреть Классную Рощу", "type": "open_app", "url": f"{app_base}/?tab=grove"}]
        ]
        
        return await self.send_message(chat_id, text, buttons)

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
            "Authorization": self.bot_token.strip(),
            "Content-Type": "application/json"
        }
        params = {}
        if chat_id:
            try:
                params["chat_id"] = int(chat_id)
            except (ValueError, TypeError):
                params["chat_id"] = str(chat_id)

        body: Dict[str, Any] = {
            "text": text,
        }

        if buttons:
            formatted_keyboard = []
            for row in buttons:
                formatted_row = []
                for btn in row:
                    b_type = btn.get("type", "link")
                    if b_type == "open_app":
                        btn_obj: Dict[str, Any] = {
                            "type": "open_app",
                            "text": btn.get("text", "Открыть"),
                            "web_app": self.bot_username
                        }
                        if "payload" in btn and btn["payload"]:
                            btn_obj["payload"] = str(btn["payload"])
                        formatted_row.append(btn_obj)
                    elif b_type == "callback":
                        formatted_row.append({
                            "type": "callback",
                            "text": btn.get("text", "Выбрать"),
                            "payload": str(btn.get("payload", "ok"))
                        })
                    else:
                        formatted_row.append({
                            "type": "link",
                            "text": btn.get("text", "Открыть"),
                            "url": btn.get("url", settings.MAX_WEBAPP_URL or "https://max.ru")
                        })
                if formatted_row:
                    formatted_keyboard.append(formatted_row)

            if formatted_keyboard:
                body["attachments"] = [
                    {
                        "type": "inline_keyboard",
                        "payload": {
                            "buttons": formatted_keyboard
                        }
                    }
                ]

        try:
            async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
                resp = await client.post(url, params=params, json=body, headers=headers)
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
