# -*- coding: utf-8 -*-
with open('backend/test_school_topics_calibration.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

trimmed = lines[:278]

new_tests = '''

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
'''

with open('backend/test_school_topics_calibration.py', 'w', encoding='utf-8') as f:
    f.writelines(trimmed)
    f.write(new_tests)

print('Updated test_school_topics_calibration.py successfully!')
