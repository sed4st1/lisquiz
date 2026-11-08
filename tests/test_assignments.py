"""Тесты для эндпоинтов заданий, дейликов и работы над ошибками (Lisquiz 2.0)."""

import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.db.session import async_session_maker
from backend.app.db.models import (
    SpacedRepetitionModel,
)


@pytest.mark.asyncio
async def test_daily_quests_and_claim():
    """Тест получения ежедневных квестов и забора награды."""
    dev_id = f"test_daily_{uuid.uuid4().hex[:8]}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Регистрация ученика
        ex_res = await client.post(
            "/api/auth/exchange",
            json={"quick_role": "student", "device_id": dev_id, "name": "Ученик Дейли"},
        )
        assert ex_res.status_code == 200
        token = ex_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Получаем дейлики
        daily_res = await client.get("/api/assignments/daily", headers=headers)
        assert daily_res.status_code == 200
        data = daily_res.json()
        assert "quests" in data
        assert "daily_question" in data
        assert data["quests"]["warmup_solved"] is False

        # Забираем награду за дейлик (разминка)
        claim_res = await client.post(
            "/api/assignments/daily/claim",
            json={"quest_id": "warmup"},
            headers=headers,
        )
        assert claim_res.status_code == 200
        claim_data = claim_res.json()
        assert claim_data["status"] == "success"
        assert claim_data["acorns_awarded"] > 0

        # Повторное получение: теперь разминка решена
        after_res = await client.get("/api/assignments/daily", headers=headers)
        after_data = after_res.json()
        assert after_data["quests"]["warmup_claimed"] is True


@pytest.mark.asyncio
async def test_teacher_class_assignment_workflow():
    """Тест создания задания учителем и сдачи учеником."""
    t_dev = f"test_t_{uuid.uuid4().hex[:8]}"
    s_dev = f"test_s_{uuid.uuid4().hex[:8]}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Регистрация учителя
        t_res = await client.post(
            "/api/auth/exchange",
            json={"quick_role": "teacher", "device_id": t_dev, "name": "Учитель Тест"},
        )
        t_token = t_res.json()["access_token"]
        t_headers = {"Authorization": f"Bearer {t_token}"}

        # Регистрация ученика
        s_res = await client.post(
            "/api/auth/exchange",
            json={"quick_role": "student", "device_id": s_dev, "name": "Ученик Класса"},
        )
        s_token = s_res.json()["access_token"]
        s_headers = {"Authorization": f"Bearer {s_token}"}

        # Учитель создает класс
        class_res = await client.post(
            "/api/classes",
            json={"name": "7А", "subject": "Физика", "grade": 7},
            headers=t_headers,
        )
        assert class_res.status_code == 201
        cls_info = class_res.json()["class"]
        class_id = cls_info["id"]
        invite_code = cls_info["invite_code"]

        # Ученик вступает в класс
        join_res = await client.post(
            "/api/classes/join",
            json={"invite_code": invite_code},
            headers=s_headers,
        )
        assert join_res.status_code == 200

        # Учитель выдает задание классу
        assign_res = await client.post(
            f"/api/assignments/classes/{class_id}",
            json={
                "title": "§22 Плотность вещества — Домашний тест",
                "subject": "Физика",
                "grade": 7,
                "deadline_days": 3,
                "reward_acorns": 50,
                "reward_xp": 100,
            },
            headers=t_headers,
        )
        assert assign_res.status_code == 200
        assign_id = assign_res.json()["assignment_id"]

        # Учитель просматривает задания класса
        list_res = await client.get(
            f"/api/assignments/classes/{class_id}",
            headers=t_headers,
        )
        assert list_res.status_code == 200
        assignments = list_res.json()
        assert len(assignments) >= 1
        assert assignments[0]["title"] == "§22 Плотность вещества — Домашний тест"

        # Ученик проверяет свои задания
        my_res = await client.get("/api/assignments/my", headers=s_headers)
        assert my_res.status_code == 200
        my_data = my_res.json()
        assert my_data["class_name"] == "7А"
        assert len(my_data["assignments"]) >= 1

        # Ученик сдает задание
        sub_res = await client.post(
            f"/api/assignments/{assign_id}/submit",
            json={"score": 850, "accuracy_percent": 100},
            headers=s_headers,
        )
        assert sub_res.status_code == 200
        sub_data = sub_res.json()
        assert sub_data["status"] == "success"
        assert sub_data["reward_acorns"] == 50


@pytest.mark.asyncio
async def test_student_mistakes_redemption():
    """Тест получения реальных ошибок ученика и их отработки."""
    m_dev = f"test_m_{uuid.uuid4().hex[:8]}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Регистрация ученика
        ex_res = await client.post(
            "/api/auth/exchange",
            json={"quick_role": "student", "device_id": m_dev, "name": "Ученик Ошибки"},
        )
        token = ex_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        pid = ex_res.json()["user"]["pseudonym_id"]

        # Добавляем реальную ошибку в базу
        async with async_session_maker() as session:
            mistake = SpacedRepetitionModel(
                pseudonym_id=pid,
                question_id=1,
                topic="Плотность",
                step_interval=1,
                trigger_at=datetime.now(timezone.utc),
                question_text="Чему равна плотность бруска массы 800 г и объема 200 см³?",
                explanation="Плотность равна отношению массы к объему: ρ = m/V = 800/200 = 4 г/см³",
                options_json=["4 г/см³", "2 г/см³", "1600 г/см³", "0.25 г/см³"],
                is_completed=False,
            )
            session.add(mistake)
            await session.commit()
            await session.refresh(mistake)
            mistake_id = mistake.id

        # Ученик запрашивает список ошибок
        mistakes_res = await client.get("/api/assignments/mistakes", headers=headers)
        assert mistakes_res.status_code == 200
        m_list = mistakes_res.json()["mistakes"]
        assert len(m_list) >= 1
        assert m_list[0]["id"] == mistake_id
        assert m_list[0]["question_text"].startswith("Чему равна плотность")

        # Ученик подтверждает исправление ошибки
        resolve_res = await client.post(
            f"/api/assignments/mistakes/{mistake_id}/resolve",
            headers=headers,
        )
        assert resolve_res.status_code == 200
        res_data = resolve_res.json()
        assert res_data["status"] == "success"
        assert res_data["reward_acorns"] == 40
