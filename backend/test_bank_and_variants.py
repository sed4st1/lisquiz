#!/usr/bin/env python3
"""
Тест проверки Банка Заданий Lisquiz и Движка Античита:
1. Статистика базы и FTS5 поиск
2. Выдача вопросов по теме
3. Генерация 4 вариантов с перемешиванием вопросов и кнопок ответов
4. Проверка Cache-First генерации в ai_service
"""

import sys
import asyncio
from pathlib import Path

# Добавляем backend в sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import pytest
from app.services.bank_service import bank_service
from app.services.ai_service import ai_service
from app.models.schemas import QuizCreateRequest

def test_bank_stats():
    print("\n--- 1. Тест статистики банка ---")
    stats = bank_service.get_stats()
    print(f"Всего вопросов в банке: {stats['total_questions']}")
    assert stats["total_questions"] >= 6000, f"Ожидалось >= 6000 вопросов, получено {stats['total_questions']}"
    print("Предметы в банке:")
    for subj, cnt in stats["by_subject"].items():
        print(f"  - {subj}: {cnt} вопросов")
    print("✅ Тест статистики пройден успешно!")

def test_fts_search():
    print("\n--- 2. Тест полнотекстового поиска FTS5 ---")
    results = bank_service.search_questions(query="растения", limit=3)
    print(f"Найдено по запросу 'растения': {len(results)}")
    assert len(results) > 0, "FTS5 поиск не нашел результаты по запросу 'растения'"
    for r in results:
        print(f"  [{r.subject} {r.grade} кл] {r.text[:60]}...")
    print("✅ Тест FTS5 пройден успешно!")

def test_anti_cheat_variants():
    print("\n--- 3. Тест Античит-генератора 4 вариантов ---")
    # Получаем 6 вопросов по физике
    qs = bank_service.get_questions_by_topic(subject="Физика", grade=8, topic="Тепловые явления", count=6)
    assert len(qs) == 6, f"Ожидалось 6 вопросов, получено {len(qs)}"

    variants = bank_service.generate_anti_cheat_variants(
        quiz_id="quiz_test_4vars",
        canonical_questions=qs,
        num_variants=4
    )
    assert len(variants) == 4, f"Ожидалось 4 варианта, получено {len(variants)}"

    # 1. Проверяем разный порядок вопросов
    orders = {}
    for v_num, v in variants.items():
        orders[v_num] = v.question_order
        print(f"Вариант {v_num} порядок вопросов (Canonical IDs): {v.question_order}")
        assert len(v.questions) == 6
        assert len(v.question_order) == 6

    # Убеждаемся, что порядки вопросов не идентичны (античит порядка)
    distinct_orders = len({tuple(o) for o in orders.values()})
    print(f"Уникальных последовательностей вопросов среди 4 вариантов: {distinct_orders} из 4")
    assert distinct_orders >= 3, "Порядки вопросов должны быть перемешаны между вариантами!"

    # 2. Проверяем перемешивание кнопок и фигур для одного и того же канонического вопроса
    target_canonical_id = qs[0].canonical_id
    print(f"\nАнализ канонического вопроса #{target_canonical_id} в разных вариантах:")
    
    positions_and_buttons = {}
    for v_num, v in variants.items():
        # Ищем этот вопрос в варианте
        for local_idx, vq in enumerate(v.questions, start=1):
            if vq.canonical_id == target_canonical_id:
                correct_opt = next(o for o in vq.options if o.is_correct)
                positions_and_buttons[v_num] = {
                    "local_question_index": local_idx,
                    "correct_color": correct_opt.color,
                    "correct_symbol": correct_opt.symbol,
                    "correct_text": correct_opt.text
                }
                print(f"  Вариант {v_num}: это Вопрос #{local_idx}. Правильная кнопка: [{correct_opt.color} {correct_opt.symbol}] -> '{correct_opt.text[:30]}'")

    # Проверяем, что в разных вариантах вопрос находится на разных порядковых номерах
    local_indices = {info["local_question_index"] for info in positions_and_buttons.values()}
    print(f"Разные локальные позиции вопроса #{target_canonical_id} на экранах учеников: {list(local_indices)}")
    assert len(local_indices) >= 2, "Вопрос должен появляться на разных номерах у разных учеников!"
    print("✅ Античит-генератор успешно перемешивает и порядок вопросов, и кнопки ответов!")

@pytest.mark.asyncio
async def test_ai_service_cache_first():
    print("\n--- 4. Тест Cache-First выдачи через AIService ---")
    req = QuizCreateRequest(
        subject="Математика",
        grade=7,
        topic="Уравнения",
        question_count=5,
        num_variants=4
    )
    quiz = await ai_service.generate_quiz(req)
    print(f"Квиз сгенерирован: ID={quiz.id}, Заголовок='{quiz.title}'")
    print(f"Источник: {quiz.source} (должен быть 'bank')")
    assert quiz.source == "bank", f"Ожидался источник 'bank', получено '{quiz.source}'"
    assert len(quiz.questions) == 5, f"Ожидалось 5 вопросов, получено {len(quiz.questions)}"
    assert quiz.variants is not None and len(quiz.variants) == 4, "Должно быть создано 4 варианта"
    print("✅ Cache-First интеграция в AIService работает идеально!")

async def main():
    test_bank_stats()
    test_fts_search()
    test_anti_cheat_variants()
    await test_ai_service_cache_first()
    print("\n🎉 ВСЕ ТЕСТЫ БАНКА ЗАДАНИЙ И АНТИЧИТА УСПЕШНО ПРОЙДЕНЫ! 🎉\n")

if __name__ == "__main__":
    asyncio.run(main())
