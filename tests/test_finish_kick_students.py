import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.room_state_engine import room_state_engine, GameRoom, RoomStatus
from backend.app.models.schemas import Quiz, Question, AnswerOption, Player

client = TestClient(app)

def test_close_room_kicks_students():
    room_code = "TESTKICK"
    quiz = Quiz(
        id="q1",
        title="Test",
        subject="Math",
        grade=5,
        topic="General",
        questions=[
            Question(
                id=1,
                text="Q1",
                time_limit_sec=10,
                options=[AnswerOption(id=1, text="A", is_correct=True)]
            )
        ]
    )
    room = GameRoom(
        room_code=room_code,
        teacher_id="t1",
        class_id="c1",
        quiz=quiz,
        status=RoomStatus.QUESTION,
        players={
            "s1": Player(id="s1", name="Student1", avatar="bear", score=100, connected=True),
            "s2": Player(id="s2", name="Student2", avatar="bunny", score=200, connected=True)
        }
    )
    room_state_engine.rooms[room_code] = room

    # Call close endpoint
    response = client.post(f"/api/rooms/{room_code}/close")
    assert response.status_code == 200
    assert response.json()["status"] == "closed"

    # Verify room is FINISHED and players marked disconnected
    assert room.status == RoomStatus.FINISHED
    for p in room.players.values():
        assert p.connected is False
