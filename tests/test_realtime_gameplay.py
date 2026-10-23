import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.schemas import Quiz, Question, AnswerOption
from backend.app.services.room_state_engine import room_state_engine


def test_e2e_real_multiplayer_gameplay():
    """
    Сквозной интеграционный тест реального подключения и синхронизации:
    1. Учитель создает комнату -> 0 фиктивных учеников в лобби.
    2. Ученик 1 и Ученик 2 реально подключаются по PIN.
    3. Учитель видит живое пополнение лобби (PLAYER_JOINED).
    4. Учитель запускает игру -> COUNTDOWN_START -> QUESTION_START.
    5. Ученики отвечают -> ANSWER_COLLECTED учителю -> PERSONAL_ANSWER_RESULT ученикам.
    6. Раскрытие ответов (SHOW_RESULTS) и лидерборд (SHOW_LEADERBOARD).
    """
    client = TestClient(app)

    # 1. Учитель создает комнату
    sample_quiz = {
        "title": "Сложение дробей",
        "subject": "Математика",
        "grade": 5,
        "topic": "Обыкновенные дроби",
        "questions": [
            {
                "id": 1,
                "text": "1/3 + 1/3 = ?",
                "time_limit_sec": 15,
                "options": [
                    {"id": 0, "text": "2/3", "is_correct": True, "symbol": "triangle", "color": "orange"},
                    {"id": 1, "text": "2/6", "is_correct": False, "symbol": "diamond", "color": "blue"},
                ]
            }
        ]
    }
    create_resp = client.post("/api/rooms", json={"quiz": sample_quiz, "teacher_name": "Анна Ивановна"})
    assert create_resp.status_code == 201
    room_data = create_resp.json()
    pin = room_data["room_code"]
    teacher_token = room_data["teacher_token"]

    # 2. Учитель подключается по WebSocket
    with client.websocket_connect(f"/ws/rooms/{pin}?token={teacher_token}") as teacher_ws:
        # Получаем SYNC_STATE
        sync_msg = teacher_ws.receive_json()
        assert sync_msg["event"] == "SYNC_STATE"
        # Убеждаемся: в комнате 0 учеников, нет никаких фиктивных моков!
        assert len(sync_msg["data"]["players"]) == 0

        # 3. Ученик 1 (Алиса) входит по PIN
        join_resp_1 = client.post(f"/api/rooms/{pin}/join", json={"name": "Алиса", "avatar": "hedgehog"})
        assert join_resp_1.status_code == 200
        token_1 = join_resp_1.json()["session_token"]
        id_1 = join_resp_1.json()["player_id"]

        with client.websocket_connect(f"/ws/rooms/{pin}?token={token_1}") as s1_ws:
            s1_sync = s1_ws.receive_json()
            assert s1_sync["event"] == "SYNC_STATE"
            # Алиса видит себя в комнате
            assert any(p["id"] == id_1 for p in s1_sync["data"]["players"])

            # Учитель получает оповещение о подключении Алисы в реальном времени!
            t_msg = teacher_ws.receive_json()
            assert t_msg["event"] == "PLAYER_JOINED"
            assert t_msg["data"]["name"] == "Алиса"
            assert t_msg["data"]["avatar"] == "hedgehog"
            assert t_msg["data"]["total_players"] == 1

            # 4. Ученик 2 (Борис) входит по PIN
            join_resp_2 = client.post(f"/api/rooms/{pin}/join", json={"name": "Борис", "avatar": "bear"})
            assert join_resp_2.status_code == 200
            token_2 = join_resp_2.json()["session_token"]
            id_2 = join_resp_2.json()["player_id"]

            with client.websocket_connect(f"/ws/rooms/{pin}?token={token_2}") as s2_ws:
                s2_sync = s2_ws.receive_json()
                assert s2_sync["event"] == "SYNC_STATE"
                assert len(s2_sync["data"]["players"]) == 2

                # И учитель, и Алиса получают оповещение о Борисе!
                t_msg2 = teacher_ws.receive_json()
                assert t_msg2["event"] == "PLAYER_JOINED"
                assert t_msg2["data"]["name"] == "Борис"
                assert t_msg2["data"]["total_players"] == 2

                s1_notif = s1_ws.receive_json()
                assert s1_notif["event"] == "PLAYER_JOINED"
                assert s1_notif["data"]["name"] == "Борис"

                # 5. Учитель нажимает «Начать викторину»
                teacher_ws.send_json({"event": "TEACHER_ACTION", "data": {"action": "START_GAME"}})

                # Все участники получают COUNTDOWN_START
                t_cd = teacher_ws.receive_json()
                assert t_cd["event"] == "COUNTDOWN_START"
                assert t_cd["data"]["countdown_sec"] == 3

                s1_cd = s1_ws.receive_json()
                assert s1_cd["event"] == "COUNTDOWN_START"

                s2_cd = s2_ws.receive_json()
                assert s2_cd["event"] == "COUNTDOWN_START"

                # 6. Старт вопроса
                teacher_ws.send_json({"event": "TEACHER_ACTION", "data": {"action": "START_QUESTION", "question_index": 0}})

                t_q = teacher_ws.receive_json()
                assert t_q["event"] == "QUESTION_START"
                # У учителя виден правильный ответ
                assert t_q["data"]["question"]["options"][0]["is_correct"] is True

                s1_q = s1_ws.receive_json()
                assert s1_q["event"] == "QUESTION_START"
                # Для ученика правильный ответ скрыт античитом
                assert s1_q["data"]["question"]["options"][0]["is_correct"] is False

                s2_q = s2_ws.receive_json()
                assert s2_q["event"] == "QUESTION_START"

                # 7. Алиса и Борис отправляют ответы
                s1_ws.send_json({
                    "event": "SUBMIT_ANSWER",
                    "data": {
                        "question_id": 1,
                        "option_id": 0,
                        "time_taken_sec": 3.5,
                        "tab_blurred": False
                    }
                })

                # Алиса получает персональный результат
                s1_res = s1_ws.receive_json()
                assert s1_res["event"] == "PERSONAL_ANSWER_RESULT"
                assert s1_res["data"]["is_correct"] is True
                assert s1_res["data"]["points_awarded"] > 500

                # Учитель видит инкремент счетчика ответов
                t_ans1 = teacher_ws.receive_json()
                assert t_ans1["event"] == "ANSWER_COLLECTED"
                assert t_ans1["data"]["answered_count"] == 1
                assert t_ans1["data"]["all_answered"] is False

                # Борис отвечает
                s2_ws.send_json({
                    "event": "SUBMIT_ANSWER",
                    "data": {
                        "question_id": 1,
                        "option_id": 1,
                        "time_taken_sec": 4.0,
                        "tab_blurred": False
                    }
                })
                s2_res = s2_ws.receive_json()
                assert s2_res["event"] == "PERSONAL_ANSWER_RESULT"
                assert s2_res["data"]["is_correct"] is False

                t_ans2 = teacher_ws.receive_json()
                assert t_ans2["event"] == "ANSWER_COLLECTED"
                assert t_ans2["data"]["answered_count"] == 2
                assert t_ans2["data"]["all_answered"] is True

                # 8. Учитель раскрывает результаты
                teacher_ws.send_json({"event": "TEACHER_ACTION", "data": {"action": "SHOW_RESULTS"}})

                t_res = teacher_ws.receive_json()
                assert t_res["event"] == "QUESTION_RESULTS"
                assert t_res["data"]["distribution"]["0"] == 1
                assert t_res["data"]["distribution"]["1"] == 1

                s1_qres = s1_ws.receive_json()
                assert s1_qres["event"] == "QUESTION_RESULTS"

                s2_qres = s2_ws.receive_json()
                assert s2_qres["event"] == "QUESTION_RESULTS"

                # 9. Лидерборд раунда
                teacher_ws.send_json({"event": "TEACHER_ACTION", "data": {"action": "SHOW_LEADERBOARD"}})
                t_lb = teacher_ws.receive_json()
                assert t_lb["event"] == "LEADERBOARD_UPDATE"
                top_players = t_lb["data"]["top_players"]
                assert top_players[0]["name"] == "Алиса"  # Алиса на 1 месте
                assert top_players[0]["rank"] == 1
