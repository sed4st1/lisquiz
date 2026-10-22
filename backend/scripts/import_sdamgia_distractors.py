#!/usr/bin/env python3
"""
Скрипт экстракции аутентичных заданий из «Сдам ГИА» (Решу ЕГЭ/ОГЭ)
и синтеза 3 методических дистракторов через GigaChat API.

Фокус:
1. Русский язык (орфоэпия/ударения, паронимы, орфография корней и приставок, пунктуация)
2. Литература (теория литературы, жанры, классические произведения)

Каждое задание превращается в мобильный тест формата «1 из 4» и сохраняется в SQLite банк.
"""

import sys
import re
import asyncio
import logging
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional

# Добавляем backend в sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import sdamgia
from app.services.gigachat_client import gigachat_client
from app.services.bank_service import bank_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sdamgia_importer")

def clean_html(raw_html: str) -> str:
    """Очистка HTML тегов, спецсимволов и мягких переносов"""
    if not raw_html:
        return ""
    text = re.sub(r'<[^>]+>', ' ', raw_html)
    text = text.replace('\xad', '')  # Удаление мягких переносов
    text = text.replace('\xa0', ' ')  # Неразрывные пробелы
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

TARGET_TOPICS_RUS = [
    {"topic_id": "4", "category_id": "375", "name": "Постановка ударения (Орфоэпия)", "grade": 10},
    {"topic_id": "5", "category_id": "376", "name": "Употребление паронимов", "grade": 10},
    {"topic_id": "9", "category_id": "287", "name": "Правописание корней", "grade": 9},
    {"topic_id": "10", "category_id": "288", "name": "Правописание приставок", "grade": 9},
    {"topic_id": "13", "category_id": "292", "name": "Правописание НЕ и НИ", "grade": 8},
    {"topic_id": "15", "category_id": "294", "name": "Правописание Н и НН", "grade": 8},
]

TARGET_TOPICS_LIT = [
    {"topic_id": "3", "category_id": "13", "name": "Теория литературы (роды и жанры)", "grade": 9},
    {"topic_id": "6", "category_id": "14", "name": "Литературные термины и приемы", "grade": 9},
]

async def process_single_task(
    subject: str,
    subject_code: str,
    topic_info: Dict[str, Any],
    problem_id: str,
    gia: sdamgia.SdamGIA
) -> Optional[Dict[str, Any]]:
    """Получение задачи из СдамГИА и синтез дистракторов через GigaChat"""
    try:
        prob = gia.get_problem_by_id(subject_code, problem_id)
        if not prob:
            return None

        condition = clean_html(prob.get("condition", {}).get("text", ""))
        solution = clean_html(prob.get("solution", {}).get("text", ""))
        answer = prob.get("answer", "").strip()

        # Выбираем содержательный текст задания (в sdamgia-api текст вопроса часто в solution, а в condition — справочник)
        if 15 <= len(solution) <= 1200:
            task_text = solution
        elif 15 <= len(condition) <= 1200:
            task_text = condition
        else:
            task_text = (solution if len(solution) > 15 else condition)[:1000]

        if len(task_text) < 15:
            return None

        # Синтез 3 дистракторов через GigaChat
        synthesized = await gigachat_client.synthesize_distractors(
            raw_condition=task_text[:500],
            correct_answer=answer if answer else "Указано в пояснении",
            topic=topic_info["name"],
            subject=subject
        )

        q_text = synthesized.get("question_text", "").strip()
        correct_opt = synthesized.get("correct_option", "").strip()
        distr_1 = synthesized.get("distractor_1", "").strip()
        distr_2 = synthesized.get("distractor_2", "").strip()
        distr_3 = synthesized.get("distractor_3", "").strip()
        explanation = synthesized.get("explanation", "").strip()

        options = [correct_opt, distr_1, distr_2, distr_3]
        if any(len(o) < 1 or len(o) > 65 for o in options) or len(set(options)) != 4:
            return None

        # В банке правильный вариант ставим на 'A', а античит-рандомизатор перемешает для каждого ученика
        return {
            "canonical_id": f"sdamgia_{subject_code}_{problem_id}",
            "subject": subject,
            "grade": topic_info["grade"],
            "topic": topic_info["name"],
            "section": "ОГЭ/ЕГЭ Сдам ГИА",
            "question_text": q_text,
            "option_a": correct_opt,
            "option_b": distr_1,
            "option_c": distr_2,
            "option_d": distr_3,
            "correct_key": "A",
            "explanation": explanation,
            "difficulty": "medium",
            "meta_source": "sdamgia_gigachat"
        }
    except Exception as e:
        logger.warning("Ошибка обработки задачи %s (%s): %s", problem_id, subject, e)
        return None

async def import_sdamgia_dataset(limit_per_category: int = 3):
    """Пакетный сбор задач и синтез дистракторов"""
    logger.info("=== Запуск экстракции СдамГИА и синтеза дистракторов через GigaChat ===")
    gia = sdamgia.SdamGIA()
    collected_questions = []

    # 1. Русский язык
    for topic in TARGET_TOPICS_RUS:
        logger.info("Обработка темы: %s (категория %s)...", topic["name"], topic["category_id"])
        try:
            problem_ids = gia.get_category_by_id("rus", topic["category_id"])
            if not problem_ids:
                continue
            
            selected_ids = problem_ids[:limit_per_category]
            for pid in selected_ids:
                q = await process_single_task(
                    subject="Русский язык",
                    subject_code="rus",
                    topic_info=topic,
                    problem_id=pid,
                    gia=gia
                )
                if q:
                    collected_questions.append(q)
                    logger.info("  [+] Синтезирован вопрос: %s...", q["question_text"][:50])
                await asyncio.sleep(0.5)  # Защита от троттлинга API
        except Exception as e:
            logger.error("Ошибка категории %s: %s", topic["name"], e)

    # 2. Литература
    for topic in TARGET_TOPICS_LIT:
        logger.info("Обработка темы: %s (категория %s)...", topic["name"], topic["category_id"])
        try:
            problem_ids = gia.get_category_by_id("lit", topic["category_id"])
            if not problem_ids:
                continue
            
            selected_ids = problem_ids[:limit_per_category]
            for pid in selected_ids:
                q = await process_single_task(
                    subject="Литература",
                    subject_code="lit",
                    topic_info=topic,
                    problem_id=pid,
                    gia=gia
                )
                if q:
                    collected_questions.append(q)
                    logger.info("  [+] Синтезирован вопрос: %s...", q["question_text"][:50])
                await asyncio.sleep(0.5)
        except Exception as e:
            logger.error("Ошибка категории литературы %s: %s", topic["name"], e)

    logger.info("Всего успешно синтезировано заданий: %d", len(collected_questions))
    if collected_questions:
        inserted = bank_service.insert_questions(collected_questions)
        logger.info("Сохранено в банк заданий: %d новых вопросов!", inserted)

    # Итоговая статистика банка
    stats = bank_service.get_stats()
    logger.info("Обновленная статистика банка заданий:")
    for subj, count in stats["by_subject"].items():
        logger.info("  - %s: %d вопросов", subj, count)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Импорт СдамГИА с синтезом дистракторов через GigaChat")
    parser.add_argument("--limit", type=int, default=2, help="Лимит задач на категорию (по умолчанию 2)")
    args = parser.parse_args()

    asyncio.run(import_sdamgia_dataset(limit_per_category=args.limit))
