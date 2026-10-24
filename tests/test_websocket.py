import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from backend.app.main import app
from backend.app.models.schemas import Quiz, Question, AnswerOption
from backend.app.services.room_state_engine import room_state_engine


@pytest.fixture
def test_quiz():
    return Quiz(
        id="quiz_ws_test",
        title="Тест WebSockets",
        subject="Математика",
        grade=5,
        topic="Дроби",
        questions=[
            Question(
                id=1,
                text="1/2 + 1/2 = ?",
                time_limit_sec=20,
                options=[
                    AnswerOption(id=0, text="1", is_correct=True),
                    AnswerOption(id=1, text="0", is_correct=False),
                ],
            )
        ],
    )


def test_websocket_invalid_token_rejected():
    """Проверка отклонения подключения с невалидным токеном."""
    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/ws/rooms/999999?token=invalid_fake_token"):
            pass
    assert exc.value.code == 4001


@pytest.mark.asyncio
async def test_websocket_connect_and_sync_state(test_quiz):
    """Проверка подключения и получения начального пакета SYNC_STATE."""
    room, teacher_token = await room_state_engine.create_room(test_quiz)
    client = TestClient(app)

    with client.websocket_connect(f"/ws/rooms/{room.room_code}?token={teacher_token}") as ws:
        msg = ws.receive_json()
        assert msg["event"] == "SYNC_STATE"
        assert msg["data"]["room_code"] == room.room_code
        assert msg["data"]["status"] == "lobby"


@pytest.mark.asyncio
async def test_websocket_ping_pong(test_quiz):
    """Проверка механизма heartbeat (PING -> PONG)."""
    room, teacher_token = await room_state_engine.create_room(test_quiz)
    client = TestClient(app)

    with client.websocket_connect(f"/ws/rooms/{room.room_code}?token={teacher_token}") as ws:
        # Пропускаем SYNC_STATE
        ws.receive_json()

        # Отправляем PING
        ws.send_json({"event": "PING"})
        resp = ws.receive_json()
        assert resp["event"] == "PONG"
        assert "timestamp" in resp["data"]


@pytest.mark.asyncio
async def test_websocket_lobby_player_joined(test_quiz):
    """Проверка оповещения учителя о подключении нового ученика в лобби."""
    room, teacher_token = await room_state_engine.create_room(test_quiz)
    player, student_token = await room_state_engine.join_room(
        room_code=room.room_code,
        name="Иван К.",
        avatar="fox_smart",
    )

    client = TestClient(app)

    # 1. Подключается учитель
    with client.websocket_connect(f"/ws/rooms/{room.room_code}?token={teacher_token}") as ws_teacher:
        ws_teacher.receive_json()  # SYNC_STATE учителя

        # 2. Подключается ученик
        with client.websocket_connect(f"/ws/rooms/{room.room_code}?token={student_token}") as ws_student:
            student_sync = ws_student.receive_json()  # SYNC_STATE ученика
            assert student_sync["event"] == "SYNC_STATE"

            # 3. Учитель должен получить событие PLAYER_JOINED
            teacher_event = ws_teacher.receive_json()
            assert teacher_event["event"] == "PLAYER_JOINED"
            assert teacher_event["data"]["name"] == "Иван К."
            assert teacher_event["data"]["player_id"] == player.id


@pytest.mark.asyncio
async def test_websocket_teacher_kick_player(test_quiz):
    """Проверка исключения ученика учителем через WebSocket."""
    room, teacher_token = await room_state_engine.create_room(test_quiz)
    player, student_token = await room_state_engine.join_room(
        room_code=room.room_code,
        name="Нарушитель",
        avatar="bear",
    )

    client = TestClient(app)

    with client.websocket_connect(f"/ws/rooms/{room.room_code}?token={teacher_token}") as ws_teacher:
        ws_teacher.receive_json()  # SYNC_STATE учителя

        with client.websocket_connect(f"/ws/rooms/{room.room_code}?token={student_token}") as ws_student:
            ws_student.receive_json()  # SYNC_STATE ученика
            ws_teacher.receive_json()  # PLAYER_JOINED

            # Учитель исключает ученика
            ws_teacher.send_json({
                "event": "KICK_PLAYER",
                "data": {"player_id": player.id}
            })

            # Ученик получает KICKED
            kicked_msg = ws_student.receive_json()
            assert kicked_msg["event"] == "KICKED"
            assert kicked_msg["data"]["reason"] == "Исключён учителем"

            # Учитель получает PLAYER_LEFT
            left_msg = ws_teacher.receive_json()
            assert left_msg["event"] == "PLAYER_LEFT"
            assert left_msg["data"]["player_id"] == player.id
