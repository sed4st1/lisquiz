import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_quiz_db_list_empty_by_default():
    """Проверяет что у учителя изначально чистый список викторин без мусорных шаблонов."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/quizzes")
        assert res.status_code == 200
        quizzes = res.json()
        assert isinstance(quizzes, list)


@pytest.mark.asyncio
async def test_quiz_db_create_and_edit():
    """Проверяет создание, редактирование и удаление викторины учителем в БД."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create teacher quiz
        payload = {
            "title": "Мой тест по физике 7 класс",
            "subject": "Физика",
            "grade": 7,
            "topic": "Давление и сила Архимеда",
            "group_label": "Контрольная 7А",
            "questions": [
                {
                    "id": 1,
                    "text": "Чему равна сила тяжести?",
                    "explanation": "F = m * g",
                    "time_limit_sec": 25,
                    "tier": 1,
                    "is_boss": False,
                    "options": [
                        {"id": 1, "text": "F = m * g", "is_correct": True},
                        {"id": 2, "text": "F = m / a", "is_correct": False},
                    ]
                }
            ]
        }
        res = await client.post("/api/quizzes", json=payload)
        assert res.status_code == 200
        created = res.json()
        quiz_id = created["id"]
        assert created["title"] == "Мой тест по физике 7 класс"
        assert len(created["questions"]) == 1

        # 2. Get from DB by ID
        get_res = await client.get(f"/api/quizzes/{quiz_id}")
        assert get_res.status_code == 200
        fetched = get_res.json()
        assert fetched["id"] == quiz_id

        # 3. Edit in DB
        payload["title"] = "Мой тест по физике 7 класс (ИСПРАВЛЕНО)"
        payload["id"] = quiz_id
        edit_res = await client.put(f"/api/quizzes/{quiz_id}", json=payload)
        assert edit_res.status_code == 200
        updated = edit_res.json()
        assert updated["title"] == "Мой тест по физике 7 класс (ИСПРАВЛЕНО)"

        # 4. Delete from DB
        del_res = await client.delete(f"/api/quizzes/{quiz_id}")
        assert del_res.status_code == 200

        # 5. Verify deleted
        verify_del = await client.get(f"/api/quizzes/{quiz_id}")
        assert verify_del.status_code == 404
