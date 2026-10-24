import pytest
import asyncio
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.room_state_engine import room_state_engine
from backend.app.models.schemas import Quiz, Question, AnswerOption, UserRole

@pytest.mark.asyncio
async def test_multi_question_seamless_flow():
    """
    Проверка непрерывного игрового цикла:
    - Вопрос 1 -> Ответ -> Результаты -> Вопрос 2 -> Финиш.
    - Ученик ни на одном этапе не выбрасывается и сессия не теряется.
    """
    quiz = Quiz(
        id="77",
        title="Тест двух вопросов",
        subject="Математика",
        topic="Алгебра",
        grade=7,
        questions=[
            Question(
                id=101,
                text="Сколько будет 2 + 2?",
                options=[
                    AnswerOption(id=1, text="4", is_correct=True),
                    AnswerOption(id=2, text="5", is_correct=False),
                ],
                time_limit_sec=15,
                tier=1,
            ),
            Question(
                id=102,
                text="Сколько будет 3 * 3?",
                options=[
                    AnswerOption(id=3, text="9", is_correct=True),
                    AnswerOption(id=4, text="6", is_correct=False),
                ],
                time_limit_sec=15,
                tier=1,
            ),
        ],
    )

    room, teacher_token = await room_state_engine.create_room(quiz, teacher_name="Учитель Анна")
    player, student_token = await room_state_engine.join_room(room.room_code, name="Саша П", avatar="fox_smart")

    assert player.id in room.players

    # 1. Запуск игры (LOBBY -> COUNTDOWN -> QUESTION)
    await room_state_engine.start_game(room.room_code)
    await room_state_engine.start_question(room.room_code, 0)
    assert room.current_question_index == 0
    assert room.status.value == "question"

    # 2. Ученик отвечает на Вопрос 1
    client = TestClient(app)
    with client.websocket_connect(f"/ws/rooms/{room.room_code}?token={student_token}") as ws:
        init_msg = ws.receive_json()
        assert init_msg["event"] == "SYNC_STATE"

        # Отправка ответа
        ws.send_json({
            "event": "SUBMIT_ANSWER",
            "data": {
                "question_id": 101,
                "option_id": 1,
                "time_taken_sec": 3.5,
                "tab_blurred": False,
            }
        })

        res_msg = ws.receive_json()
        assert res_msg["event"] == "PERSONAL_ANSWER_RESULT"
        assert res_msg["data"]["is_correct"] is True
        assert res_msg["data"]["points_awarded"] > 0

    # 3. Переход к показу результатов
    results = await room_state_engine.reveal_results(room.room_code)
    assert results["correct_option_id"] == 1

    # 4. Переход к показу лидерборда
    lb = await room_state_engine.show_leaderboard(room.room_code)
    assert len(lb["top_players"]) >= 1
    assert lb["is_last_question"] is False

    # 5. Переход к следующему вопросу (вопрос 1)
    nxt = await room_state_engine.next_question(room.room_code)
    assert nxt["has_next"] is True
    assert nxt["question_index"] == 1

    await room_state_engine.start_question(room.room_code, 1)
    assert room.current_question_index == 1
    assert room.status.value == "question"
    assert len(room.answered_player_ids) == 0  # Сброшено для нового вопроса!

    # 6. Ученик отвечает на Вопрос 2
    with client.websocket_connect(f"/ws/rooms/{room.room_code}?token={student_token}") as ws:
        init_msg = ws.receive_json()
        assert init_msg["event"] == "SYNC_STATE"
        assert init_msg["data"]["current_question_index"] == 1
        assert init_msg["data"]["has_answered"] is False

        ws.send_json({
            "event": "SUBMIT_ANSWER",
            "data": {
                "question_id": 102,
                "option_id": 3,
                "time_taken_sec": 2.0,
                "tab_blurred": False,
            }
        })

        res_msg = ws.receive_json()
        assert res_msg["event"] == "PERSONAL_ANSWER_RESULT"
        assert res_msg["data"]["is_correct"] is True

    # 7. Финал игры
    await room_state_engine.reveal_results(room.room_code)
    lb2 = await room_state_engine.show_leaderboard(room.room_code)
    assert lb2["is_last_question"] is True

    finish_res = await room_state_engine.next_question(room.room_code)
    assert finish_res["has_next"] is False
    assert finish_res["status"] == "finished"

    gap_report = await room_state_engine.generate_gap_report(room.room_code)
    assert gap_report is not None
    assert gap_report.total_participants == 1
    assert gap_report.class_accuracy_percent == 100


@pytest.mark.asyncio
async def test_direct_next_question_from_results():
    """
    Проверка требования пользователя: переход к следующему вопросу
    сразу со страницы результатов раунда (REVEAL_RESULTS -> COUNTDOWN),
    минуя показ лидерборда, без выбрасывания участников.
    """
    quiz = Quiz(
        id="88",
        title="Тест прямого перехода",
        subject="Математика",
        topic="Дроби",
        grade=5,
        questions=[
            Question(id=1, text="Вопрос 1", options=[AnswerOption(id=1, text="А", is_correct=True)], time_limit_sec=10),
            Question(id=2, text="Вопрос 2", options=[AnswerOption(id=2, text="Б", is_correct=True)], time_limit_sec=10),
        ],
    )

    room, teacher_token = await room_state_engine.create_room(quiz)
    player, student_token = await room_state_engine.join_room(room.room_code, name="Даша")

    await room_state_engine.start_game(room.room_code)
    await room_state_engine.start_question(room.room_code, 0)
    assert room.status.value == "question"

    # Учитель открывает результаты раунда
    await room_state_engine.reveal_results(room.room_code)
    assert room.status.value == "reveal_results"

    # Нажатие «Следующий вопрос» прямо из результатов:
    # должно успешно перевести комнату в COUNTDOWN, а затем в QUESTION (вопрос 2)
    nxt = await room_state_engine.next_question(room.room_code)
    assert nxt["has_next"] is True
    assert nxt["question_index"] == 1
    assert room.status.value == "countdown"

    await room_state_engine.start_question(room.room_code, 1)
    assert room.status.value == "question"
    assert room.current_question_index == 1

