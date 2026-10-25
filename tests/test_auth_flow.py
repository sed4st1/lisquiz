import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    return TestClient(app)


def test_bot_simulate_start(client):
    """Тест эмуляции команды /start от бота Сферума (генерация тикета входа)."""
    payload = {
        "command": "/start",
        "role": "teacher",
        "name": "Шабалта Ангелина Валерьевна",
        "raw_user_id": "max_user_angelina",
        "avatar": "fox_smart"
    }
    resp = client.post("/api/auth/bot/simulate-start", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "ticket" in data
    assert data["ticket"].startswith("tkt_")
    assert "launch_url" in data
    assert f"?ticket={data['ticket']}" in data["launch_url"]
    assert "pseudonym_id" in data
    assert data["pseudonym_id"].startswith("pid_")


def test_exchange_ticket_to_jwt(client):
    """Тест обмена одноразового тикета на подписанный JWT access token."""
    # 1. Сгенерировать тикет
    init_res = client.post("/api/auth/bot/simulate-start", json={
        "command": "/start",
        "role": "student",
        "name": "Иван Кошельник",
        "raw_user_id": "max_user_ivan",
        "avatar": "raccoon"
    })
    ticket = init_res.json()["ticket"]

    # 2. Обменять тикет на JWT
    exchange_res = client.post("/api/auth/exchange", json={"ticket": ticket})
    assert exchange_res.status_code == 200
    token_data = exchange_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["user"]["role"] == "student"
    assert token_data["user"]["display_name"] == "Иван Кошельник"
    assert token_data["user"]["pseudonym_id"].startswith("pid_")

    token = token_data["access_token"]

    # 3. Проверить эндпоинт GET /api/auth/me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["display_name"] == "Иван Кошельник"
    assert me_data["role"] == "student"


def test_quick_dev_login(client):
    """Тест мгновенного dev-входа в 1 клик для переключения учитель/ученик."""
    # Вход как учитель
    resp_teacher = client.post("/api/auth/exchange", json={"quick_role": "teacher"})
    assert resp_teacher.status_code == 200
    t_data = resp_teacher.json()
    assert t_data["user"]["role"] == "teacher"
    assert "access_token" in t_data

    # Вход как ученик
    resp_student = client.post("/api/auth/exchange", json={"quick_role": "student"})
    assert resp_student.status_code == 200
    s_data = resp_student.json()
    assert s_data["user"]["role"] == "student"
    assert "access_token" in s_data
