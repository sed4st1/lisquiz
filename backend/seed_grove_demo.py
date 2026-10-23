import os
import sys
from backend.app.services.grove_service import grove_service

# Ensure default demo data exists for class_7a if empty
grove = grove_service.get_or_create_grove("class_7a")
lb = grove_service.get_weekly_leaderboard("class_7a")

if lb["total_students"] == 0 or grove["total_xp"] < 3500:
    print("Populating initial demo session for class_7a...")
    demo_session = [
        {"student_id": "std_artem", "student_name": "Артём В.", "avatar": "bear", "points_earned": 1820, "tier1_correct": 2, "tier2_correct": 3, "tier3_correct": 4, "total_questions": 9},
        {"student_id": "std_sofia", "student_name": "София Л.", "avatar": "owl", "points_earned": 1570, "tier1_correct": 3, "tier2_correct": 3, "tier3_correct": 2, "total_questions": 8},
        {"student_id": "std_ivan", "student_name": "Иван К. (Ты)", "avatar": "raccoon", "points_earned": 1450, "tier1_correct": 4, "tier2_correct": 3, "tier3_correct": 1, "total_questions": 8},
        {"student_id": "std_masha", "student_name": "Маша К.", "avatar": "hedgehog", "points_earned": 1290, "tier1_correct": 3, "tier2_correct": 4, "tier3_correct": 1, "total_questions": 8},
        {"student_id": "std_dima", "student_name": "Дима С.", "avatar": "squirrel", "points_earned": 1180, "tier1_correct": 5, "tier2_correct": 2, "tier3_correct": 0, "total_questions": 7},
        {"student_id": "std_polina", "student_name": "Полина Т.", "avatar": "bunny", "points_earned": 1040, "tier1_correct": 4, "tier2_correct": 2, "tier3_correct": 0, "total_questions": 6},
        {"student_id": "std_kirill", "student_name": "Кирилл М.", "avatar": "bear", "points_earned": 960, "tier1_correct": 5, "tier2_correct": 1, "tier3_correct": 0, "total_questions": 6},
        {"student_id": "std_alina", "student_name": "Алина Д.", "avatar": "hedgehog", "points_earned": 890, "tier1_correct": 4, "tier2_correct": 1, "tier3_correct": 0, "total_questions": 5},
    ]
    res = grove_service.apply_quiz_session("class_7a", demo_session)
    print("Applied demo session. New XP:", res["new_total_xp"])

# Ensure student ivan has some starting cards
inv = grove_service.get_student_inventory("std_ivan")
if inv["unique_cards_count"] == 0:
    print("Pulling initial cards for std_ivan...")
    # Give some acorns
    with grove_service._get_connection() as conn:
        conn.cursor().execute("UPDATE student_gacha_state SET acorns_balance = 250 WHERE student_id = 'std_ivan'")
        conn.commit()
    for _ in range(4):
        grove_service.pull_knowledge_card("std_ivan")

print("Done! Check complete.")
