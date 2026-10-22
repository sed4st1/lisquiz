import pytest
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.models.schemas import Quiz, Question, AnswerOption
from backend.app.services.room_state_engine import room_state_engine


@pytest.fixture
def two_question_quiz():
    return Quiz(
        id="quiz_loop_test",
        title="Тест игрового цикла",
        subject="Математика",
        grade=5,
        topic="Сложение дробей",
        questions=[
            Question(
                id=1,
                text="1/3 + 1/3 = ?",
                time_limit_sec=10,
                topic="Сложение",
                explanation="Складываем числители: 1 + 1 = 2.",
                options=[
                    AnswerOption(id=0, text="2/3", is_correct=True, symbol="triangle", color="orange"),
                    AnswerOption(id=1, text="2/6", is_correct=False, symbol="diamond", color="blue"),
                ],
            ),
            Question(
                id=2,
                text="Какая дробь равна единице?",
                time_limit_sec=10,
                topic="Свойства",
                explanation="Если числитель равен знаменателю, дробь равна 1.",
                options=[
                    AnswerOption(id=0, text="4/4", is_correct=True, symbol="triangle", color="orange"),
                    AnswerOption(id=1, text="1/4", is_correct=False, symbol="diamond", color="blue"),
                ],
            ),
        ],
    )


@pytest.mark.asyncio
async def test_full_game_loop_two_players(two_question_quiz):
    """
    Полный тест сквозного игрового цикла:
    1. Создание комнаты учителем.
    2. Вход двух учеников (Алиса и Борис).
    3. Запуск игры (COUNTDOWN_START).
    4. Старт вопроса 1 (проверка скрытия ответа для учеников).
    5. Отправка ответов: Алиса отвечает верно (2/3), Борис неверно (2/6).
    6. Показ результатов вопроса 1 (распределение ответов 1 к 1).
    7. Показ лидерборда (Алиса на 1 месте).
    8. Переход ко 2 вопросу.
    9. Старт вопроса 2, оба отвечают верно.
    10. Завершение игры: событие GAME_FINISHED и валидация Gap Report.
    """
    room, teacher_token = await room_state_engine.create_room(two_question_quiz)
    player1, token1 = await room_state_engine.join_room(room.room_code, name="Алиса", avatar="fox_smart")
    player2, token2 = await room_state_engine.join_room(room.room_code, name="Борис", avatar="bear")

    client = TestClient(app)

    with client.websocket_connect(f"/ws/rooms/{room.room_code}?token={teacher_token}") as ws_t:
        ws_t.receive_json()  # SYNC_STATE

        with client.websocket_connect(f"/ws/rooms/{room.room_code}?token={token1}") as ws_p1:
            ws_p1.receive_json()  # SYNC_STATE
            ws_t.receive_json()   # PLAYER_JOINED p1

            with client.websocket_connect(f"/ws/rooms/{room.room_code}?token={token2}") as ws_p2:
                ws_p2.receive_json()  # SYNC_STATE
                ws_t.receive_json()   # PLAYER_JOINED p2
                ws_p1.receive_json()  # PLAYER_JOINED p2

                # 3. Учитель запускает игру
                ws_t.send_json({"event": "TEACHER_ACTION", "data": {"action": "START_GAME"}})

                evt_t = ws_t.receive_json()
                evt_p1 = ws_p1.receive_json()
                evt_p2 = ws_p2.receive_json()
                assert evt_t["event"] == "COUNTDOWN_START"
                assert evt_p1["event"] == "COUNTDOWN_START"
                assert evt_p2["event"] == "COUNTDOWN_START"

                # 4. Старт первого вопроса
                ws_t.send_json({
                    "event": "TEACHER_ACTION",
                    "data": {"action": "START_QUESTION", "question_index": 0}
                })

                q_teacher = ws_t.receive_json()
                assert q_teacher["event"] == "QUESTION_START"
                assert q_teacher["data"]["question"]["options"][0]["is_correct"] is True  # Учитель видит правильный

                q_p1 = ws_p1.receive_json()
                assert q_p1["event"] == "QUESTION_START"
                assert q_p1["data"]["question"]["options"][0]["is_correct"] is False  # Ученик 1 НЕ видит правильный

                q_p2 = ws_p2.receive_json()
                assert q_p2["event"] == "QUESTION_START"
                assert q_p2["data"]["question"]["options"][0]["is_correct"] is False  # Ученик 2 НЕ видит правильный

                # 5. Ответы: Алиса верно (id: 0), Борис неверно (id: 1)
                ws_p1.send_json({
                    "event": "SUBMIT_ANSWER",
                    "data": {"question_id": 1, "option_id": 0, "time_taken_sec": 2.5}
                })
                res_p1 = ws_p1.receive_json()
                assert res_p1["event"] == "PERSONAL_ANSWER_RESULT"
                assert res_p1["data"]["is_correct"] is True
                assert res_p1["data"]["points_awarded"] > 0

                # Учитель получил нотификацию об ответе p1
                col1 = ws_t.receive_json()
                assert col1["event"] == "ANSWER_COLLECTED"
                assert col1["data"]["answered_count"] == 1
                assert col1["data"]["all_answered"] is False

                ws_p2.send_json({
                    "event": "SUBMIT_ANSWER",
                    "data": {"question_id": 1, "option_id": 1, "time_taken_sec": 3.0}
                })
                res_p2 = ws_p2.receive_json()
                assert res_p2["event"] == "PERSONAL_ANSWER_RESULT"
                assert res_p2["data"]["is_correct"] is False
                assert res_p2["data"]["points_awarded"] == 0

                col2 = ws_t.receive_json()
                assert col2["event"] == "ANSWER_COLLECTED"
                assert col2["data"]["answered_count"] == 2
                assert col2["data"]["all_answered"] is True

                # 6. Учитель показывает результаты вопроса
                ws_t.send_json({"event": "TEACHER_ACTION", "data": {"action": "SHOW_RESULTS"}})
                res_t = ws_t.receive_json()
                assert res_t["event"] == "QUESTION_RESULTS"
                assert res_t["data"]["correct_option_id"] == 0
                assert res_t["data"]["distribution"]["0"] == 1
                assert res_t["data"]["distribution"]["1"] == 1
                assert ws_p1.receive_json()["event"] == "QUESTION_RESULTS"
                assert ws_p2.receive_json()["event"] == "QUESTION_RESULTS"

                # 7. Учитель показывает лидерборд
                ws_t.send_json({"event": "TEACHER_ACTION", "data": {"action": "SHOW_LEADERBOARD"}})
                lb_t = ws_t.receive_json()
                assert lb_t["event"] == "LEADERBOARD_UPDATE"
                top = lb_t["data"]["top_players"]
                assert top[0]["name"] == "Алиса"
                assert top[0]["rank"] == 1
                assert top[1]["name"] == "Борис"
                assert top[1]["rank"] == 2
                assert ws_p1.receive_json()["event"] == "LEADERBOARD_UPDATE"
                assert ws_p2.receive_json()["event"] == "LEADERBOARD_UPDATE"

                # 8. Переход ко второму вопросу
                ws_t.send_json({"event": "TEACHER_ACTION", "data": {"action": "NEXT_QUESTION"}})
                cd_t = ws_t.receive_json()
                assert cd_t["event"] == "COUNTDOWN_START"
                assert cd_t["data"]["question_index"] == 1
                assert ws_p1.receive_json()["event"] == "COUNTDOWN_START"
                assert ws_p2.receive_json()["event"] == "COUNTDOWN_START"

                # Старт вопроса 2
                ws_t.send_json({
                    "event": "TEACHER_ACTION",
                    "data": {"action": "START_QUESTION", "question_index": 1}
                })
                ws_t.receive_json()   # QUESTION_START teacher
                ws_p1.receive_json()  # QUESTION_START p1
                ws_p2.receive_json()  # QUESTION_START p2

                # Оба отвечают верно на вопрос 2
                ws_p1.send_json({
                    "event": "SUBMIT_ANSWER",
                    "data": {"question_id": 2, "option_id": 0, "time_taken_sec": 2.0}
                })
                ws_p1.receive_json()  # PERSONAL_ANSWER_RESULT
                ws_t.receive_json()   # ANSWER_COLLECTED

                ws_p2.send_json({
                    "event": "SUBMIT_ANSWER",
                    "data": {"question_id": 2, "option_id": 0, "time_taken_sec": 2.1}
                })
                ws_p2.receive_json()  # PERSONAL_ANSWER_RESULT
                ws_t.receive_json()   # ANSWER_COLLECTED

                # Результаты и Лидерборд вопроса 2
                ws_t.send_json({"event": "TEACHER_ACTION", "data": {"action": "SHOW_RESULTS"}})
                ws_t.receive_json()
                ws_p1.receive_json()
                ws_p2.receive_json()

                ws_t.send_json({"event": "TEACHER_ACTION", "data": {"action": "SHOW_LEADERBOARD"}})
                ws_t.receive_json()
                ws_p1.receive_json()
                ws_p2.receive_json()

                # 9. Завершение игры
                ws_t.send_json({"event": "TEACHER_ACTION", "data": {"action": "NEXT_QUESTION"}})
                fin_t = ws_t.receive_json()
                assert fin_t["event"] == "GAME_FINISHED"
                gap = fin_t["data"]["gap_report"]
                assert gap["total_participants"] == 2
                assert gap["class_accuracy_percent"] == 75  # 3 верных из 4 ответов (75%)
                assert len(gap["questions_stats"]) == 2

                assert ws_p1.receive_json()["event"] == "GAME_FINISHED"
                assert ws_p2.receive_json()["event"] == "GAME_FINISHED"
