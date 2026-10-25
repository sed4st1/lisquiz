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



@pytest.mark.asyncio
async def test_literature_grade_2_mir_skazok_lookup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/quiz/curriculum/topics?subject=Литература&grade=2")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 8
        topic_titles = [t["topic"] for t in data["topics"]]
        assert any("Мир сказок" in t for t in topic_titles)


@pytest.mark.asyncio
async def test_user_query_mir_skazok_noisy_string():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Exact string reported by the teacher: "Мир сказок для 2 КЛАСС № п/п 1"
        res = await client.get("/api/quiz/curriculum/topics?subject=Литература&grade=2&query=Мир сказок для 2 КЛАСС № п/п 1")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1
        matched_topics = [t["topic"] for t in data["topics"]]
        assert any("Мир сказок" in t for t in matched_topics)



@pytest.mark.asyncio
async def test_chemistry_curriculum_lookup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Grade 8
        res8 = await client.get("/api/quiz/curriculum/topics?subject=Химия&grade=8")
        assert res8.status_code == 200
        data8 = res8.json()
        assert data8["total"] >= 5
        titles8 = [t["topic"] for t in data8["topics"]]
        assert any("Периодический закон" in t or "Периодическ" in t for t in titles8)

        # Grade 10 (organic chemistry)
        res10 = await client.get("/api/quiz/curriculum/topics?subject=Химия&grade=10")
        assert res10.status_code == 200
        data10 = res10.json()
        assert data10["total"] >= 5
        titles10 = [t["topic"] for t in data10["topics"]]
        assert any("Бутлеров" in t or "Алканы" in t or "Углеводороды" in t for t in titles10)


@pytest.mark.asyncio
async def test_english_curriculum_lookup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/quiz/curriculum/topics?subject=Английский язык&grade=7")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1
        titles = [t["topic"] for t in data["topics"]]
        assert any("Present Perfect" in t for t in titles)


@pytest.mark.asyncio
async def test_high_school_subjects_complete():
    from backend.app.services.curriculum_catalog import curriculum_service
    # Algebra 10th grade
    alg10 = curriculum_service.get_topics("Алгебра", 10)
    assert len(alg10) >= 3
    # Geometry 11th grade
    geom11 = curriculum_service.get_topics("Геометрия", 11)
    assert len(geom11) >= 3
    # Physics 11th grade
    phys11 = curriculum_service.get_topics("Физика", 11)
    assert len(phys11) >= 3
    # History 10th grade (WW2 / Revolution)
    hist10 = curriculum_service.get_topics("История", 10)
    assert len(hist10) >= 3
    # Biology 10th grade
    bio10 = curriculum_service.get_topics("Биология", 10)
    assert len(bio10) >= 3


@pytest.mark.asyncio
async def test_exhaustive_subject_coverage():
    from backend.app.services.curriculum_catalog import curriculum_service, FRP_CURRICULUM_DATABASE
    assert len(FRP_CURRICULUM_DATABASE) >= 250

    key_subjects = [
        "Математика", "Алгебра", "Геометрия", "Вероятность и статистика",
        "Русский язык", "Литература", "Физика", "Химия", "Биология",
        "История", "Обществознание", "География", "Информатика",
        "Английский язык", "Окружающий мир"
    ]
    for s in key_subjects:
        topics = curriculum_service.get_topics(subject=s)
        assert len(topics) >= 4, f"Subject {s} must have at least 4 topics in FRP catalog, found {len(topics)}"
