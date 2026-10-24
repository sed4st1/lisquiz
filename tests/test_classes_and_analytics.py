"""Тесты для долгосрочной статистики, привязки учеников к классам и Spaced Repetition (152-ФЗ)."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.services.auth_service import auth_service


@pytest.mark.asyncio
async def test_create_and_list_classes():
    """Тест создания класса и получения списка классов учителя."""
    teacher_token = auth_service.create_access_token(
        data={"sub": "usr_teacher_1", "pseudonym_id": "pid_teacher_7a", "role": "teacher", "name": "Марья Ивановна"}
    )
    headers = {"Authorization": f"Bearer {teacher_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Создание класса 7А
        res = await client.post(
            "/api/classes",
            headers=headers,
            json={"name": "7А", "subject": "Алгебра", "grade": 7},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "created"
        cls = data["class"]
        assert cls["name"] == "7А"
        assert cls["subject"] == "Алгебра"
        assert cls["grade"] == 7
        assert "invite_code" in cls
        assert "7A" in cls["invite_code"] or "CLS" in cls["invite_code"]
        class_id = cls["id"]

        # 2. Получение списка классов учителя
        list_res = await client.get("/api/classes", headers=headers)
        assert list_res.status_code == 200
        classes = list_res.json()["classes"]
        assert any(c["id"] == class_id for c in classes)

        # 3. Получение деталей конкретного класса
        get_res = await client.get(f"/api/classes/{class_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == class_id


@pytest.mark.asyncio
async def test_student_join_class():
    """Тест вступления учеников в класс по инвайт-коду."""
    teacher_token = auth_service.create_access_token(
        data={"sub": "usr_teacher_2", "pseudonym_id": "pid_teacher_8b", "role": "teacher", "name": "Пётр Сергеевич"}
    )
    student_token = auth_service.create_access_token(
        data={"sub": "usr_stud_1", "pseudonym_id": "pid_stud_ivan_k", "role": "student", "name": "Иван К"}
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Создаем класс 8Б
        create_res = await client.post(
            "/api/classes",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"name": "8Б", "subject": "Геометрия", "grade": 8},
        )
        inv_code = create_res.json()["class"]["invite_code"]
        cls_id = create_res.json()["class"]["id"]

        # Ученик вступает по invite_code
        join_res = await client.post(
            "/api/classes/join",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"invite_code": inv_code},
        )
        assert join_res.status_code == 200
        join_data = join_res.json()
        assert join_data["status"] == "joined"
        assert join_data["class_id"] == cls_id
        assert join_data["students_count"] >= 1

        # Повторное вступление того же ученика (идемпотентность)
        rejoin_res = await client.post(
            "/api/classes/join",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"invite_code": inv_code},
        )
        assert rejoin_res.status_code == 200


@pytest.mark.asyncio
async def test_create_room_with_class_id_and_leaderboard():
    """Тест создания комнаты с привязкой к class_id и проверка лидерборда."""
    teacher_token = auth_service.create_access_token(
        data={"sub": "usr_teacher_3", "pseudonym_id": "pid_teacher_9a", "role": "teacher", "name": "Ольга Николаевна"}
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Создаем класс 9А
        cls_res = await client.post(
            "/api/classes",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"name": "9А", "subject": "Физика", "grade": 9},
        )
        cls_id = cls_res.json()["class"]["id"]
        inv_code = cls_res.json()["class"]["invite_code"]

        # 2. Добавляем двух учеников
        await client.post("/api/classes/join", json={"invite_code": inv_code, "pseudonym_id": "pid_s1"})
        await client.post("/api/classes/join", json={"invite_code": inv_code, "pseudonym_id": "pid_s2"})

        # 3. Создаем игровую комнату, привязанную к классу
        room_res = await client.post(
            "/api/rooms",
            json={
                "teacher_name": "Ольга Николаевна",
                "class_id": cls_id,
                "subject": "Физика",
                "grade": 9,
                "topic": "Законы Ньютона",
            },
        )
        assert room_res.status_code == 201
        room_data = room_res.json()
        assert room_data["class_id"] == cls_id

        # 4. Проверяем накопительный лидерборд класса
        lb_res = await client.get(f"/api/classes/{cls_id}/leaderboard")
        assert lb_res.status_code == 200
        lb_data = lb_res.json()
        assert lb_data["class_id"] == cls_id
        assert lb_data["total_students"] == 2
        assert len(lb_data["leaderboard"]) == 2

        # 5. Проверяем аналитику дефицитов (Class Gap Heatmap)
        analytics_res = await client.get(f"/api/classes/{cls_id}/analytics")
        assert analytics_res.status_code == 200
        analytics_data = analytics_res.json()
        assert analytics_data["class_id"] == cls_id
        assert "spaced_repetition_boosters" in analytics_data
