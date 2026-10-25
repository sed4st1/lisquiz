import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_room_creation_clears_mismatched_textbook():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Teacher specifies Russian, but sends stale math textbook id
        resp = await ac.post("/api/rooms", json={
            "subject": "Русский язык",
            "grade": 7,
            "topic": "Чередование корней",
            "question_count": 3,
            "textbook_id": "vilenkin_math_6",
            "paragraph_num": 7
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["subject"] == "Русский язык"
        assert "Математика" not in data["quiz_title"]
        assert "ФГОС" not in data["quiz_title"]
        assert "ФРП" not in data["quiz_title"]
        assert "quiz" in data
        assert len(data["quiz"]["questions"]) == 3
        assert data["quiz"]["subject"] == "Русский язык"

@pytest.mark.asyncio
async def test_room_creation_matching_textbook_no_fgos():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Teacher chooses math and matching textbook
        resp = await ac.post("/api/rooms", json={
            "subject": "Математика",
            "grade": 6,
            "textbook_id": "vilenkin_math_6",
            "paragraph_num": 1,
            "question_count": 3
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["subject"] == "Математика"
        assert "ФГОС" not in data["quiz_title"]
        assert "ФРП" not in data["quiz_title"]
        assert "quiz" in data
