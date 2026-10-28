import pytest
from httpx import AsyncClient, ASGITransport
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent))

try:
    from backend.app.main import app
    from backend.app.services.bank_service import bank_service
    from backend.app.services.ai_service import AIService
    from backend.app.models.schemas import QuizCreateRequest
except ImportError:
    from app.main import app
    from app.services.bank_service import bank_service
    from app.services.ai_service import AIService
    from app.models.schemas import QuizCreateRequest

@pytest.mark.asyncio
async def test_bank_topics_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # All topics
        res = await client.get("/api/quiz/bank/topics")
        assert res.status_code == 200
        data = res.json()
        assert "topics" in data
        assert data["total_topics"] > 0
        assert any(t["subject"] == "Математика" for t in data["topics"])

        # Filtered by subject and grade
        res_math = await client.get("/api/quiz/bank/topics?subject=Математика&grade=6")
        assert res_math.status_code == 200
        math_data = res_math.json()
        assert math_data["total_topics"] >= 1
        for t in math_data["topics"]:
            assert t["subject"] == "Математика"
            assert t["grade"] == 6
            assert t["count"] > 0
            assert "display_name" in t

@pytest.mark.asyncio
async def test_bank_service_tier_progression():
    qs = bank_service.get_questions_by_topic("Математика", 6, "Школьная математика и геометрия", 3)
    assert len(qs) == 3
    # Q1: Tier 1, 15s
    assert qs[0].tier == 1
    assert qs[0].time_limit_sec == 15
    assert not qs[0].is_boss

    # Q2: Tier 2, 25s
    assert qs[1].tier == 2
    assert qs[1].time_limit_sec == 25
    assert not qs[1].is_boss

    # Q3: Tier 3 Boss, 40s
    assert qs[2].tier == 3
    assert qs[2].time_limit_sec == 40
    assert qs[2].is_boss

@pytest.mark.asyncio
async def test_ai_service_tier_progression():
    ai = AIService()
    quiz = await ai.generate_quiz(QuizCreateRequest(
        subject="Математика",
        grade=6,
        topic="Школьная математика и геометрия",
        question_count=3
    ))
    assert len(quiz.questions) == 3
    assert quiz.questions[0].tier == 1
    assert quiz.questions[0].time_limit_sec == 15
    assert quiz.questions[-1].tier == 3
    assert quiz.questions[-1].time_limit_sec == 40
    assert quiz.questions[-1].is_boss
