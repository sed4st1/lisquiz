"""Тесты для ежедневных стриков активности ('огоньки'), профиля и оповещений класса."""

import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.services.auth_service import auth_service
from backend.app.db.session import async_session_maker
from backend.app.db.models import UserModel


@pytest.mark.asyncio
async def test_user_streak_calculation():
    """Тест расчета стрика активности пользователя ('огоньки')."""
    pid = "pid_streak_test_user"
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    async with async_session_maker() as session:
        user = await auth_service.get_or_create_user(
            session=session,
            pseudonym_id=pid,
            role="student",
            display_name="Тест Стрика",
        )
        assert user.streak_days >= 1
        assert user.last_active_date == today_str

        # Симулируем вчерашний вход
        yesterday_str = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
        user.last_active_date = yesterday_str
        user.streak_days = 3
        await session.commit()

        # Вход сегодня должен увеличить стрик с 3 до 4
        auth_service.update_user_streak(user)
        assert user.streak_days == 4
        assert user.last_active_date == today_str

        # Симулируем пропуск двух дней
        three_days_ago = (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d")
        user.last_active_date = three_days_ago
        user.streak_days = 4
        await session.commit()

        # Вход после пропуска должен сбросить стрик на 1
        auth_service.update_user_streak(user)
        assert user.streak_days == 1
        assert user.last_active_date == today_str


@pytest.mark.asyncio
async def test_auth_me_returns_stats():
    """Тест эндпоинта /api/auth/me: возврат стрика, очков и желудей."""
    pid = "pid_me_stats_user"
    token = auth_service.create_access_token(
        data={"sub": "usr_me_stats", "pseudonym_id": pid, "role": "student", "name": "Ученик Статистика"}
    )
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Регистрируем через dev login
        ex_res = await client.post(
            "/api/auth/exchange",
            json={"quick_role": "student", "device_id": "test_device_stats", "name": "Ученик Статистика"},
        )
        assert ex_res.status_code == 200
        user_data = ex_res.json()["user"]
        assert "streak_days" in user_data
        assert user_data["streak_days"] >= 1
        assert "total_score" in user_data
        assert "quizzes_played" in user_data
        assert "acorns" in user_data

        jwt_token = ex_res.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {jwt_token}"}

        # Запрашиваем /api/auth/me
        me_res = await client.get("/api/auth/me", headers=auth_headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["streak_days"] >= 1
        assert me_data["acorns"] >= 0
        assert me_data["total_score"] >= 0


@pytest.mark.asyncio
async def test_notify_class_endpoint():
    """Тест эндпоинта /api/rooms/{pin}/notify-class."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Создаем комнату
        create_res = await client.post(
            "/api/rooms",
            json={"teacher_name": "Учитель Тест", "subject": "Физика", "grade": 7},
        )
        assert create_res.status_code == 201
        pin = create_res.json()["room_code"]

        # Отправляем оповещение
        notify_res = await client.post(f"/api/rooms/{pin}/notify-class")
        assert notify_res.status_code == 200
        data = notify_res.json()
        assert "share_url" in data
        assert pin in data["share_url"]
