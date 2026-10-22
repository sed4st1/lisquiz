import base64
import time
import uuid
import asyncio
import logging
from typing import Optional
import httpx
from ..config import settings

logger = logging.getLogger(__name__)

OAUTH_ENDPOINT = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"

class GigaChatAuthManager:
    """
    Менеджер аутентификации в GigaChat API (Сбер).
    Автоматически получает токен доступа (OAuth 2.0 Bearer),
    кэширует его на 30 минут и обновляет за 2 минуты до истечения.
    """
    def __init__(self):
        self._access_token: Optional[str] = None
        self._expires_at_ms: int = 0
        self._lock = asyncio.Lock()

    def get_auth_key(self) -> str:
        """
        Возвращает Authorization Key в формате Base64(Client_ID:Client_Secret).
        """
        if settings.GIGACHAT_CREDENTIALS:
            return settings.GIGACHAT_CREDENTIALS.strip()
        
        if settings.GIGACHAT_CLIENT_ID and settings.GIGACHAT_CLIENT_SECRET:
            raw = f"{settings.GIGACHAT_CLIENT_ID.strip()}:{settings.GIGACHAT_CLIENT_SECRET.strip()}"
            return base64.b64encode(raw.encode("utf-8")).decode("utf-8")
        
        raise ValueError(
            "Не заданы учетные данные GigaChat! "
            "Укажите GIGACHAT_CREDENTIALS или пару GIGACHAT_CLIENT_ID + GIGACHAT_CLIENT_SECRET в .env."
        )

    async def get_token(self, force_refresh: bool = False) -> str:
        """
        Возвращает валидный Access Token.
        При необходимости обновляет токен через API Сбера.
        """
        current_time_ms = int(time.time() * 1000)
        # Если токен есть и до истечения более 2 минут (120 000 мс)
        if not force_refresh and self._access_token and (self._expires_at_ms - current_time_ms > 120_000):
            return self._access_token

        async with self._lock:
            # Двойная проверка после взятия блокировки
            current_time_ms = int(time.time() * 1000)
            if not force_refresh and self._access_token and (self._expires_at_ms - current_time_ms > 120_000):
                return self._access_token

            auth_key = self.get_auth_key()
            rquid = str(uuid.uuid4())
            headers = {
                "Authorization": f"Basic {auth_key}",
                "RqUID": rquid,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            }
            data = {
                "scope": settings.GIGACHAT_SCOPE or "GIGACHAT_API_PERS"
            }

            logger.info("Запрос нового access token в GigaChat OAuth (RqUID: %s)", rquid)

            # verify=False требуется из-за SSL-сертификатов Минцифры РФ на устройствах Sber
            async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
                try:
                    response = await client.post(OAUTH_ENDPOINT, headers=headers, data=data)
                    response.raise_for_status()
                except httpx.HTTPStatusError as e:
                    logger.error("Ошибка авторизации GigaChat (HTTP %s): %s", e.response.status_code, e.response.text)
                    raise RuntimeError(
                        f"Ошибка авторизации GigaChat (HTTP {e.response.status_code}). "
                        f"Проверьте корректность Authorization Key или Client ID / Secret."
                    ) from e
                except Exception as e:
                    logger.error("Сетевая ошибка при запросе токена GigaChat: %s", e)
                    raise RuntimeError(f"Не удалось подключиться к серверу авторизации GigaChat: {e}") from e

                payload = response.json()
                self._access_token = payload.get("access_token")
                self._expires_at_ms = payload.get("expires_at", current_time_ms + 1800 * 1000)

                logger.info(
                    "GigaChat access token успешно получен! Действителен до %s",
                    time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(self._expires_at_ms / 1000))
                )
                return self._access_token

gigachat_auth = GigaChatAuthManager()
