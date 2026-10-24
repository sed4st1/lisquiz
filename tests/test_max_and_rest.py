import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.schemas import Quiz, Question, AnswerOption, AnswerSubmission
from backend.app.services.room_state_engine import room_state_engine
from backend.app.services.max_bot_service import max_bot_service


@pytest.fixture
def client():
    return TestClient(app)


def test_max_status(client):
    """Проверка статуса подключения платформы MAX (Сферум)."""
    resp = client.get("/api/max/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "security" in data
    assert "152-FZ" in data["security"]


def test_max_init_data_auth(client):
    """Проверка валидации параметров запуска Mini App (initData) и генерации Zero-PII PID."""
    raw_init_data = "user=%7B%22id%22%3A123456%2C%22first_name%22%3A%22%D0%98%D0%B2%D0%B0%D0%BD%22%7D&auth_date=1729680000"
    resp = client.post("/api/max/auth/validate", json={"init_data": raw_init_data})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert "pseudonym_id" in data
    assert data["pseudonym_id"].startswith("pid_")


def test_max_bot_command_simulation(client):
    """Эмуляция команд чат-бота лисёнка Спринта (/start, /quiz, /grove)."""
    # 1. /start
    resp_start = client.post("/api/max/simulate-command", json={"user_id": "u1", "chat_id": "c1", "text": "/start"})
    assert resp_start.status_code == 200
    assert resp_start.json()["result"]["command"] == "/start"

    # 2. /grove
    resp_grove = client.post("/api/max/simulate-command", json={"user_id": "u1", "chat_id": "c1", "text": "/grove"})
    assert resp_grove.status_code == 200
    assert resp_grove.json()["result"]["command"] == "/grove"

    # 3. /quiz with invalid PIN
    resp_quiz = client.post("/api/max/simulate-command", json={"user_id": "u1", "chat_id": "c1", "text": "/quiz 999999"})
    assert resp_quiz.status_code == 200
    assert resp_quiz.json()["result"]["command"] == "/quiz"


def test_quiz_catalog_topics(client):
    """Проверка предзагруженного каталога тем по ФРП РФ."""
    resp = client.get("/api/quiz/catalog/topics?subject=Математика&grade=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "catalog" in data
    assert len(data["catalog"]) > 0
    math5 = data["catalog"][0]
    assert math5["subject"] == "Математика"
    assert math5["grade"] == 5
    assert "Обыкновенные дроби" in math5["topics"]


def test_quiz_save_get_delete(client):
    """Проверка REST CRUD сохранения и чтения структуры викторины."""
    sample = {
        "title": "Тестовая викторина 7 класс",
        "subject": "Физика",
        "grade": 7,
        "topic": "Плотность вещества",
        "questions": [
            {
                "id": 1,
                "text": "Чему равна плотность воды?",
                "explanation": "1000 кг/м³",
                "time_limit_sec": 20,
                "options": [
                    {"id": 0, "text": "1000 кг/м³", "is_correct": True},
                    {"id": 1, "text": "800 кг/м³", "is_correct": False}
                ]
            }
        ]
    }
    # 1. Сохранение
    resp_post = client.post("/api/quiz", json=sample)
    assert resp_post.status_code == 200
    quiz_data = resp_post.json()
    quiz_id = quiz_data["id"]
    assert quiz_id.startswith("quiz_")

    # 2. Получение
    resp_get = client.get(f"/api/quiz/{quiz_id}")
    assert resp_get.status_code == 200
    assert resp_get.json()["title"] == "Тестовая викторина 7 класс"

    # 3. Удаление
    resp_del = client.delete(f"/api/quiz/{quiz_id}")
    assert resp_del.status_code == 200
    assert resp_del.json()["status"] == "deleted"

    # 4. Повторное получение -> 404
    resp_404 = client.get(f"/api/quiz/{quiz_id}")
    assert resp_404.status_code == 404


@pytest.mark.asyncio
async def test_gap_report_rest_and_csv_export(client):
    """Проверка REST эндпоинтов матрицы дефицитов (JSON и Excel-совместимый CSV)."""
    # 1. Создаем комнату и симулируем ответы
    test_quiz = Quiz(
        id="quiz_rep_test",
        title="Тест отчета дефицитов",
        subject="Математика",
        grade=5,
        topic="Дроби",
        questions=[
            Question(
                id=1,
                text="1/2 + 1/2 = ?",
                time_limit_sec=15,
                options=[
                    AnswerOption(id=0, text="1", is_correct=True),
                    AnswerOption(id=1, text="2/4", is_correct=False),
                ]
            )
        ]
    )
    room, teacher_token = await room_state_engine.create_room(test_quiz)
    code = room.room_code
    p1, _ = await room_state_engine.join_room(code, "Ученик 1")

    await room_state_engine.start_game(code)
    await room_state_engine.start_question(code, 0)
    await room_state_engine.record_answer(
        AnswerSubmission(
            room_code=code,
            player_id=p1.id,
            question_id=1,
            option_id=0,
            time_taken_sec=3.0,
            tab_blurred=False,
        )
    )

    # 2. JSON отчет
    resp_rep = client.get(f"/api/rooms/{code}/report")
    assert resp_rep.status_code == 200
    data = resp_rep.json()
    assert data["room_code"] == code
    assert data["total_participants"] == 1
    assert data["class_accuracy_percent"] == 100

    # 3. CSV экспорт
    resp_csv = client.get(f"/api/rooms/{code}/export/csv")
    assert resp_csv.status_code == 200
    assert "text/csv" in resp_csv.headers["content-type"]
    assert "attachment" in resp_csv.headers["content-disposition"]
    # Проверка наличия UTF-8 BOM
    content_bytes = resp_csv.content
    assert content_bytes.startswith(b"\xef\xbb\xbf")
    content_text = content_bytes.decode("utf-8-sig")
    assert "Тест отчета дефицитов" in content_text
    assert code in content_text
