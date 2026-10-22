#!/usr/bin/env python3
"""
Скрипт импорта открытых образовательных датасетов в локальный банк Lisquiz (SQLite).
Источники (Hugging Face):
1. RussianNLP/tape (ru_openbook, ru_worldtree) — начальная и средняя школа (1–6 классы)
2. MERA-evaluation/MERA (rummlu) — средняя и старшая школа (5–11 классы)

Применяет ML-валидацию и фильтры адаптивности мобильного экрана:
- Длина вопроса <= 240 символов
- Длина варианта <= 65 символов
- Отсутствие дублирующихся ответов внутри вопроса
- Баланс длины правильного ответа (защита от подсказок)
"""

import sys
import re
import json
import logging
import httpx
from pathlib import Path
from typing import List, Dict, Any, Optional

# Добавляем родительский каталог в sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.bank_service import bank_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("importer")

HF_HEADERS = {"User-Agent": "Lisquiz-Educational-Platform/1.0"}

SUBJECT_MAPPING = {
    "Математика": ("Математика", [5, 6, 7, 8, 9, 10, 11]),
    "Физика": ("Физика", [7, 8, 9, 10, 11]),
    "Биология": ("Биология", [5, 6, 7, 8, 9, 10, 11]),
    "История": ("История", [5, 6, 7, 8, 9, 10, 11]),
    "География": ("География", [5, 6, 7, 8, 9, 10, 11]),
    "Общество": ("Обществознание", [6, 7, 8, 9, 10, 11]),
    "Право": ("Обществознание", [8, 9, 10, 11]),
    "Политика": ("Обществознание", [9, 10, 11]),
    "Экономика": ("Обществознание", [8, 9, 10, 11]),
    "Информационные технологии": ("Информатика", [7, 8, 9, 10, 11]),
    "Логика": ("Информатика", [5, 6, 7, 8, 9]),
}

def clean_text(text: str) -> str:
    """Удаление мусора, лишних пробелов и нормализация текста"""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def passes_mobile_linter(
    q_text: str,
    opt_a: str,
    opt_b: str,
    opt_c: str,
    opt_d: str,
    correct_key: str
) -> bool:
    """
    ML-валидатор качества тестового задания для мобильных экранов:
    1. Длина вопроса не превышает 240 символов.
    2. Длина каждого варианта не превышает 65 символов (комфортно для кнопки в 2x2 гриде).
    3. Все 4 варианта уникальны после очистки.
    4. Правильный ответ не является очевидной «подсказкой» по длине (не длиннее среднего в 3 раза).
    """
    if len(q_text) < 8 or len(q_text) > 240:
        return False

    options = [opt_a, opt_b, opt_c, opt_d]
    if any(len(opt) < 1 or len(opt) > 65 for opt in options):
        return False

    # Проверка на дубликаты вариантов
    lowered = [opt.lower().strip() for opt in options]
    if len(set(lowered)) != 4:
        return False

    # Баланс длины
    key_map = {"A": opt_a, "B": opt_b, "C": opt_c, "D": opt_d}
    correct_opt = key_map.get(correct_key, "")
    distractors = [opt for k, opt in key_map.items() if k != correct_key]
    
    if distractors:
        avg_distr_len = sum(len(d) for d in distractors) / len(distractors)
        if avg_distr_len > 0:
            ratio = len(correct_opt) / avg_distr_len
            if ratio > 3.0 or ratio < 0.2:
                return False

    return True

def fetch_jsonl(client: httpx.Client, url: str) -> List[str]:
    logger.info("Загрузка %s ...", url)
    try:
        r = client.get(url, headers=HF_HEADERS, follow_redirects=True)
        r.raise_for_status()
        return r.text.strip().splitlines()
    except Exception as e:
        logger.error("Ошибка загрузки %s: %s", url, e)
        return []

def parse_openbook_line(line: str) -> Optional[Dict[str, Any]]:
    """Парсинг строки из RuOpenBookQA"""
    try:
        data = json.loads(line)
        raw_q = data.get("question", "")
        answer = data.get("answer", "").upper().strip()
        if answer not in ("A", "B", "C", "D"):
            return None

        m = re.search(r'^(.*?)\s*\(A\)\s*(.*?)\s*\(B\)\s*(.*?)\s*\(C\)\s*(.*?)\s*\(D\)\s*(.*?)$', raw_q, re.DOTALL)
        if not m:
            return None

        q_text = clean_text(m.group(1))
        opt_a = clean_text(m.group(2))
        opt_b = clean_text(m.group(3))
        opt_c = clean_text(m.group(4))
        opt_d = clean_text(m.group(5))

        if not passes_mobile_linter(q_text, opt_a, opt_b, opt_c, opt_d, answer):
            return None

        item_id = str(data.get("ID", abs(hash(q_text))))
        return {
            "canonical_id": f"ru_ob_{item_id}",
            "subject": "Окружающий мир",
            "grade": 3,
            "topic": "Естествознание и природа",
            "section": "Человек и окружающий мир",
            "question_text": q_text,
            "option_a": opt_a,
            "option_b": opt_b,
            "option_c": opt_c,
            "option_d": opt_d,
            "correct_key": answer,
            "difficulty": "easy",
            "meta_source": "ru_openbook"
        }
    except Exception:
        return None

def parse_worldtree_line(line: str) -> Optional[Dict[str, Any]]:
    """Парсинг строки из RuWorldTree"""
    try:
        data = json.loads(line)
        raw_q = data.get("question", "")
        answer = data.get("answer", "").upper().strip()
        grade = int(data.get("school_grade", 5))
        if answer not in ("A", "B", "C", "D"):
            return None

        m = re.search(r'^(.*?)\s*\(A\)\s*(.*?)\s*\(B\)\s*(.*?)\s*\(C\)\s*(.*?)\s*\(D\)\s*(.*?)$', raw_q, re.DOTALL)
        if not m:
            return None

        q_text = clean_text(m.group(1))
        opt_a = clean_text(m.group(2))
        opt_b = clean_text(m.group(3))
        opt_c = clean_text(m.group(4))
        opt_d = clean_text(m.group(5))

        if not passes_mobile_linter(q_text, opt_a, opt_b, opt_c, opt_d, answer):
            return None

        subject = "Биология" if grade >= 5 else "Окружающий мир"
        return {
            "canonical_id": f"ru_wt_{abs(hash(q_text)) % 10000000}",
            "subject": subject,
            "grade": grade,
            "topic": "Живая природа и физические явления",
            "section": "Естествознание",
            "question_text": q_text,
            "option_a": opt_a,
            "option_b": opt_b,
            "option_c": opt_c,
            "option_d": opt_d,
            "correct_key": answer,
            "difficulty": "medium",
            "meta_source": "ru_worldtree"
        }
    except Exception:
        return None

def parse_rummlu_line(line: str) -> Optional[Dict[str, Any]]:
    """Парсинг строки из ruMMLU (MERA)"""
    try:
        data = json.loads(line)
        inputs = data.get("inputs", {})
        answer = data.get("outputs", "").upper().strip()
        raw_sub = inputs.get("subject", "")
        if answer not in ("A", "B", "C", "D"):
            return None

        if raw_sub not in SUBJECT_MAPPING:
            return None

        norm_subject, allowed_grades = SUBJECT_MAPPING[raw_sub]
        domain = data.get("meta", {}).get("domain", "school_topic")

        q_text = clean_text(inputs.get("text", ""))
        opt_a = clean_text(inputs.get("option_a", ""))
        opt_b = clean_text(inputs.get("option_b", ""))
        opt_c = clean_text(inputs.get("option_c", ""))
        opt_d = clean_text(inputs.get("option_d", ""))

        if not passes_mobile_linter(q_text, opt_a, opt_b, opt_c, opt_d, answer):
            return None

        meta_id = data.get("meta", {}).get("id", abs(hash(q_text)) % 10000000)
        # Назначаем репрезентативный класс из допустимого диапазона
        grade = allowed_grades[abs(hash(domain)) % len(allowed_grades)]

        topic_name = domain.replace("_", " ").capitalize()
        return {
            "canonical_id": f"ru_mmlu_{meta_id}_{abs(hash(q_text)) % 10000}",
            "subject": norm_subject,
            "grade": grade,
            "topic": topic_name,
            "section": raw_sub,
            "question_text": q_text,
            "option_a": opt_a,
            "option_b": opt_b,
            "option_c": opt_c,
            "option_d": opt_d,
            "correct_key": answer,
            "difficulty": "medium",
            "meta_source": "ru_mmlu"
        }
    except Exception:
        return None

def import_all_datasets(max_mmlu_records: int = 4000):
    """Основной процесс импорта"""
    logger.info("=== Запуск импорта датасетов в банк Lisquiz ===")
    
    questions_to_insert = []
    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        # 1. RuOpenBookQA (начальная школа)
        ob_urls = [
            "https://huggingface.co/datasets/RussianNLP/tape/resolve/main/dummy/raw/ru_openbook/train.jsonl",
            "https://huggingface.co/datasets/RussianNLP/tape/resolve/main/dummy/raw/ru_openbook/test.jsonl"
        ]
        for url in ob_urls:
            lines = fetch_jsonl(client, url)
            for line in lines:
                parsed = parse_openbook_line(line)
                if parsed:
                    questions_to_insert.append(parsed)
        logger.info("Собрано из RuOpenBookQA: %d вопросов", len(questions_to_insert))

        # 2. RuWorldTree (5-8 классы)
        wt_count_before = len(questions_to_insert)
        wt_urls = [
            "https://huggingface.co/datasets/RussianNLP/tape/resolve/main/dummy/raw/ru_worldtree/train.jsonl",
            "https://huggingface.co/datasets/RussianNLP/tape/resolve/main/dummy/raw/ru_worldtree/test.jsonl"
        ]
        for url in wt_urls:
            lines = fetch_jsonl(client, url)
            for line in lines:
                parsed = parse_worldtree_line(line)
                if parsed:
                    questions_to_insert.append(parsed)
        logger.info("Собрано из RuWorldTree: %d вопросов", len(questions_to_insert) - wt_count_before)

        # 3. ruMMLU (MERA)
        mmlu_count_before = len(questions_to_insert)
        mmlu_urls = [
            "https://huggingface.co/datasets/MERA-evaluation/MERA/resolve/main/data/rummlu/train.jsonl",
            "https://huggingface.co/datasets/MERA-evaluation/MERA/resolve/main/data/rummlu/test.jsonl"
        ]
        for url in mmlu_urls:
            lines = fetch_jsonl(client, url)
            for line in lines:
                parsed = parse_rummlu_line(line)
                if parsed:
                    questions_to_insert.append(parsed)
                if len(questions_to_insert) - mmlu_count_before >= max_mmlu_records:
                    break
            if len(questions_to_insert) - mmlu_count_before >= max_mmlu_records:
                break
        logger.info("Собрано из ruMMLU: %d вопросов", len(questions_to_insert) - mmlu_count_before)

    logger.info("Всего валидных отфильтрованных вопросов: %d", len(questions_to_insert))
    
    # Пакетная вставка в SQLite
    inserted = bank_service.insert_questions(questions_to_insert)
    logger.info("Успешно импортировано в банк: %d новых вопросов!", inserted)

    # Вывод статистики
    stats = bank_service.get_stats()
    logger.info("Итоговая статистика банка: %s", json.dumps(stats, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    import_all_datasets()
