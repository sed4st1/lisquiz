import logging
from typing import Dict, List, Optional
from fastapi import WebSocket
from ..models.schemas import SessionData, UserRole

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Менеджер WebSocket соединений для комнат Лисквиз.
    Обеспечивает группировку по room_code, разделение прав (учитель / ученик)
    и адресную рассылку сообщений.
    """

    def __init__(self):
        # room_code -> Dict[WebSocket, SessionData]
        self.rooms: Dict[str, Dict[WebSocket, SessionData]] = {}

    async def connect(self, websocket: WebSocket, session: SessionData):
        """Регистрация нового активного WebSocket соединения в комнате."""
        await websocket.accept()
        room_code = session.room_code
        if room_code not in self.rooms:
            self.rooms[room_code] = {}
        self.rooms[room_code][websocket] = session
        logger.info(
            f"WS Подключен: {session.name} ({session.role.value}, {session.player_id}) "
            f"к комнате {room_code}. Всего в комнате: {len(self.rooms[room_code])}"
        )

    def disconnect(self, websocket: WebSocket, room_code: str) -> Optional[SessionData]:
        """Удаление WebSocket соединения из пула комнаты."""
        if room_code in self.rooms and websocket in self.rooms[room_code]:
            session = self.rooms[room_code].pop(websocket)
            if not self.rooms[room_code]:
                self.rooms.pop(room_code, None)
            logger.info(f"WS Отключен: {session.name} из комнаты {room_code}")
            return session
        return None

    async def send_personal(self, websocket: WebSocket, event: str, data: dict):
        """Отправка персонального события конкретному сокету."""
        try:
            await websocket.send_json({"event": event, "data": data})
        except Exception as e:
            logger.warning(f"Ошибка отправки personal WS сообщения: {e}")

    async def broadcast_room(self, room_code: str, event: str, data: dict, exclude: Optional[WebSocket] = None):
        """Широковещательная рассылка всем участникам комнаты (с возможностью исключить отправителя)."""
        if room_code not in self.rooms:
            return

        payload = {"event": event, "data": data}
        dead_sockets: List[WebSocket] = []

        for ws in list(self.rooms[room_code].keys()):
            if exclude and ws == exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception as e:
                logger.warning(f"Ошибка бродкаста сокету в комнате {room_code}: {e}")
                dead_sockets.append(ws)

        for ws in dead_sockets:
            self.disconnect(ws, room_code)

    async def broadcast_teacher(self, room_code: str, event: str, data: dict):
        """Отправка события только учителю (хосту) комнаты."""
        if room_code not in self.rooms:
            return

        payload = {"event": event, "data": data}
        for ws, session in list(self.rooms[room_code].items()):
            if session.role == UserRole.TEACHER:
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass

    async def broadcast_students(self, room_code: str, event: str, data: dict):
        """Отправка события всем ученикам комнаты."""
        if room_code not in self.rooms:
            return

        payload = {"event": event, "data": data}
        for ws, session in list(self.rooms[room_code].items()):
            if session.role == UserRole.STUDENT:
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass

    async def kick_player(self, room_code: str, player_id: str, reason: str = "Исключён учителем"):
        """Принудительное закрытие соединения нежелательного игрока."""
        if room_code not in self.rooms:
            return

        target_ws = None
        for ws, session in list(self.rooms[room_code].items()):
            if session.player_id == player_id:
                target_ws = ws
                break

        if target_ws:
            try:
                await target_ws.send_json({
                    "event": "KICKED",
                    "data": {"reason": reason}
                })
                await target_ws.close(code=4003, reason=reason)
            except Exception:
                pass
            self.disconnect(target_ws, room_code)

    def get_room_connections_count(self, room_code: str) -> int:
        """Возвращает число активных WebSocket соединений в комнате."""
        return len(self.rooms.get(room_code, {}))

    async def close_room_connections(self, room_code: str, reason: str = "Викторина завершена"):
        """Рассылает всем ученикам ROOM_CLOSED и принудительно закрывает WebSocket соединения."""
        if room_code not in self.rooms:
            return

        payload = {"event": "ROOM_CLOSED", "data": {"reason": reason}}
        for ws, session in list(self.rooms[room_code].items()):
            if session.role == UserRole.STUDENT:
                try:
                    await ws.send_json(payload)
                    await ws.close(code=4000, reason=reason)
                except Exception:
                    pass
                self.rooms[room_code].pop(ws, None)

        if room_code in self.rooms and not self.rooms[room_code]:
            self.rooms.pop(room_code, None)


ws_manager = ConnectionManager()
