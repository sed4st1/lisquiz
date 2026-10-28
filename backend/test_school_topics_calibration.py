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


@pytest.mark.asyncio
async def test_english_grade_7_hobbies_exact_query():
    """Verify that teacher searching for exact edsoo.ru English 7 theme finds it."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        exact_query = "Досуг и увлечения (хобби) современного подростка (чтение, кино, театр, музей, спорт, музыка)"
        res = await client.get(
            f"/api/quiz/curriculum/topics?subject=Английский язык&grade=7&query={exact_query}"
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1
        
        found = False
        for t in data["topics"]:
            if "Досуг и увлечения" in t["topic"] and "хобби" in t["topic"]:
                found = True
                assert t["grade"] == 7
                assert t["subject"] == "Английский язык"
                assert "кино" in t["topic"]
                assert "театр" in t["topic"]
                assert "музыка" in t["topic"]
                break
        assert found, f"Target theme not found among results: {data['topics']}"


@pytest.mark.asyncio
async def test_cross_subject_edsoo_themes():
    """Verify that multiple subjects have rich official FRP coverage for middle school."""
    from backend.app.services.curriculum_catalog import curriculum_service
    
    # Russian 7th grade participles
    rus7 = curriculum_service.get_topics(subject="Русский язык", grade=7, query="Причастие")
    assert len(rus7) >= 1
    
    # History 5th grade ancient east
    hist5 = curriculum_service.get_topics(subject="История", grade=5, query="Египет")
    assert len(hist5) >= 1
    
    # Physics 7th grade Pascal / Archimedes
    phys7 = curriculum_service.get_topics(subject="Физика", grade=7, query="давление архимед")
    assert len(phys7) >= 1
    
    # Biology 8th grade human anatomy
    bio8 = curriculum_service.get_topics(subject="Биология", grade=8, query="кровообращение сердце")
    assert len(bio8) >= 1



@pytest.mark.asyncio
async def test_expanded_curriculum_database_quality():
    """Verify that all underrepresented subjects now have canonical full coverage."""
    from backend.app.services.curriculum_catalog import curriculum_service, FRP_CURRICULUM_DATABASE

    assert len(FRP_CURRICULUM_DATABASE) >= 500

    # Literature 5-8 grades
    for g in (5, 6, 7, 8):
        lit_g = curriculum_service.get_topics(subject="Литература", grade=g)
        assert len(lit_g) >= 7, f"Literature grade {g} should have >= 7 topics, got {len(lit_g)}"

    # Geography 5-8 grades
    for g in (5, 6, 7, 8):
        geo_g = curriculum_service.get_topics(subject="География", grade=g)
        assert len(geo_g) >= 5, f"Geography grade {g} should have >= 5 topics, got {len(geo_g)}"

    # Geometry 7-9 grades
    for g in (7, 8, 9):
        geom_g = curriculum_service.get_topics(subject="Геометрия", grade=g)
        assert len(geom_g) >= 5, f"Geometry grade {g} should have >= 5 topics, got {len(geom_g)}"

    # Algebra 7-9 grades
    for g in (7, 8, 9):
        alg_g = curriculum_service.get_topics(subject="Алгебра", grade=g)
        assert len(alg_g) >= 5, f"Algebra grade {g} should have >= 5 topics, got {len(alg_g)}"

    # Social studies 6-9 grades
    for g in (6, 7, 8, 9):
        soc_g = curriculum_service.get_topics(subject="Обществознание", grade=g)
        assert len(soc_g) >= 5, f"Social studies grade {g} should have >= 5 topics, got {len(soc_g)}"

    # Informatics 7-9 grades
    for g in (7, 8, 9):
        inf_g = curriculum_service.get_topics(subject="Информатика", grade=g)
        assert len(inf_g) >= 5, f"Informatics grade {g} should have >= 5 topics, got {len(inf_g)}"

    # Biology 5-9 grades
    for g in (5, 6, 7, 8, 9):
        bio_g = curriculum_service.get_topics(subject="Биология", grade=g)
        assert len(bio_g) >= 5, f"Biology grade {g} should have >= 5 topics, got {len(bio_g)}"


@pytest.mark.asyncio
async def test_all_taught_grades_have_minimum_four_topics():
    """Verify that every single subject and grade taught has at least 4 topics in DB."""
    from backend.app.services.curriculum_catalog import FRP_CURRICULUM_DATABASE
    from collections import defaultdict

    counts = defaultdict(lambda: defaultdict(int))
    for item in FRP_CURRICULUM_DATABASE:
        counts[item["subject"]][item["grade"]] += 1

    for subj, grade_dict in counts.items():
        for grade, cnt in grade_dict.items():
            assert cnt >= 4, f"Subject {subj} grade {grade} has only {cnt} topics (expected >= 4)"
