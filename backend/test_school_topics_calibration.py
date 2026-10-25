import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.services.bank_service import bank_service

@pytest.mark.asyncio
async def test_math_grade_5_school_topics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/quiz/bank/topics?subject=Математика&grade=5")
        assert res.status_code == 200
        data = res.json()
        assert data["total_topics"] >= 5
        
        topic_names = [t["topic"] for t in data["topics"]]
        # Standard Russian 5th grade topics must be present
        assert "Обыкновенные дроби" in topic_names or "Десятичные дроби" in topic_names
        assert "Проценты" in topic_names
        
        # College/University topics must NEVER appear for 5th grade!
        assert "Abstract algebra" not in topic_names
        assert "College mathematics" not in topic_names
        assert "Machine learning" not in topic_names

@pytest.mark.asyncio
async def test_math_grade_5_no_college_fallback():
    # Query questions for 5th grade math on fractions
    qs = bank_service.get_questions_by_topic(
        subject="Математика",
        grade=5,
        topic="Обыкновенные дроби",
        count=5
    )
    assert len(qs) == 5
    
    # Check that questions are school grade 5
    for q in qs:
        assert q.grade in (4, 5, 6)
        # Ensure no college math keywords
        assert "Z_3" not in q.text
        assert "кольц" not in q.text.lower()
        assert "гомоморфизм" not in q.text.lower()
        assert "матриц" not in q.text.lower()

    # Verify Tier calibration
    assert qs[0].tier == 1
    assert qs[0].time_limit_sec == 15
    assert not qs[0].is_boss
    assert qs[-1].tier == 3
    assert qs[-1].time_limit_sec == 40
    assert qs[-1].is_boss

@pytest.mark.asyncio
async def test_physics_grade_7_school_topics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/quiz/bank/topics?subject=Физика&grade=7")
        assert res.status_code == 200
        data = res.json()
        assert data["total_topics"] >= 4
        
        topic_names = [t["topic"] for t in data["topics"]]
        assert any("Архимед" in t for t in topic_names)
        assert any("Плотность" in t for t in topic_names)
        
        # College physics must NEVER appear
        assert "College physics" not in topic_names

@pytest.mark.asyncio
async def test_sympy_cas_synthesis_fallback():
    # Asking for a topic that doesn't have 10 DB questions triggers SymPy CAS synthesis
    qs = bank_service.get_questions_by_topic(
        subject="Математика",
        grade=5,
        topic="Синтез обыкновенных дробей",
        count=5
    )
    assert len(qs) == 5
    for q in qs:
        assert len(q.options) == 4
        assert any(opt.is_correct for opt in q.options)


@pytest.mark.asyncio
async def test_curriculum_catalog_edsoo_grade_5():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/quiz/curriculum/topics?subject=Математика&grade=5")
        assert res.status_code == 200
        data = res.json()
        assert data["source"] == "edsoo.ru (ФРП Минпросвещения РФ)"
        assert data["total"] >= 5
        
        topics = data["topics"]
        topic_titles = [t["topic"] for t in topics]
        assert any("Обыкновенные дроби" in t for t in topic_titles)
        
        # Verify schema
        first = topics[0]
        assert "id" in first
        assert "subject" in first
        assert "grade" in first
        assert "section" in first
        assert "description" in first
        assert len(first["description"]) > 10


@pytest.mark.asyncio
async def test_curriculum_catalog_search_query():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/quiz/curriculum/topics?subject=Математика&query=дроб")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 2
        for t in data["topics"]:
            content = (t["topic"] + t["section"] + t["description"]).lower()
            assert "дроб" in content


@pytest.mark.asyncio
async def test_curriculum_service_direct_lookup():
    from backend.app.services.curriculum_catalog import curriculum_service
    # Direct lookup by grade & subject
    topics = curriculum_service.get_topics("Физика", 7)
    assert len(topics) >= 5
    titles = [t["topic"] for t in topics]
    assert any("Архимед" in t for t in titles)
    
    # Lookup by ID
    item = curriculum_service.get_topic_by_id(topics[0]["id"])
    assert item is not None
    assert item["subject"] == "Физика"
