"""
Lisquiz Textbook & Curriculum Mapping Service (УМК-Маппер)
==========================================================
Сервис привязки школьных учебников РФ (Пёрышкин, Виленкин, Мерзляк, Ладыженская и др.)
к темам ФРП, графу навыков (DAG) и банку проверенных заданий.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from .bank_service import bank_service
from .skill_graph_service import skill_graph_service

logger = logging.getLogger("lisquiz.textbook_service")

CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "textbooks_catalog.json"


class TextbookService:
    def __init__(self, catalog_path: Path = CATALOG_PATH):
        self.catalog_path = catalog_path
        self._textbooks: List[Dict[str, Any]] = []
        self._index_by_id: Dict[str, Dict[str, Any]] = {}
        self._load_catalog()

    def _load_catalog(self):
        """Загрузка каталога учебников из JSON файла"""
        if not self.catalog_path.exists():
            logger.warning("Файл каталога учебников не найден: %s", self.catalog_path)
            self._textbooks = []
            return

        try:
            with open(self.catalog_path, "r", encoding="utf-8") as f:
                self._textbooks = json.load(f)
            self._index_by_id = {tb["id"]: tb for tb in self._textbooks}
            logger.info("Загружено учебников из каталога: %d", len(self._textbooks))
        except Exception as e:
            logger.error("Ошибка чтения каталога учебников: %s", e)
            self._textbooks = []

    def list_textbooks(
        self,
        subject: Optional[str] = None,
        grade: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Получить список учебников с фильтрацией по предмету и классу"""
        res = []
        for tb in self._textbooks:
            if subject and tb.get("subject", "").lower() != subject.lower():
                continue
            if grade and tb.get("grade") != grade:
                continue
            # Возвращаем компактную информацию без всех параграфов
            res.append({
                "id": tb["id"],
                "subject": tb["subject"],
                "grade": tb["grade"],
                "author": tb["author"],
                "title": tb["title"],
                "publisher": tb.get("publisher", ""),
                "chapters_count": len(tb.get("sections", []))
            })
        return res

    def get_textbook(self, textbook_id: str) -> Optional[Dict[str, Any]]:
        """Полная структура учебника с главами и параграфами"""
        return self._index_by_id.get(textbook_id)

    def find_paragraph(self, textbook_id: str, paragraph_num: int) -> Optional[Dict[str, Any]]:
        """Поиск конкретного параграфа в учебнике"""
        tb = self.get_textbook(textbook_id)
        if not tb:
            return None

        for section in tb.get("sections", []):
            for p in section.get("paragraphs", []):
                if p.get("num") == paragraph_num:
                    return {
                        "textbook_id": tb["id"],
                        "textbook_title": tb["title"],
                        "chapter": section.get("chapter"),
                        "paragraph_num": p["num"],
                        "title": p["title"],
                        "skill_id": p.get("skill_id"),
                        "topic": p.get("topic"),
                        "keywords": p.get("keywords", [])
                    }
        return None

    def get_questions_by_paragraph(
        self,
        textbook_id: str,
        paragraph_num: int,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Умная выборка заданий по параграфу учебника:
        1. Если есть привязка к DAG-навыку в pilot_skills.db -> берём проверенные канонические задачи.
        2. Иначе -> ищем в 6,313 задачах question_bank.db через полнотекстовый поиск FTS5.
        3. Если задач недостаточно -> добираем генератором.
        """
        para_info = self.find_paragraph(textbook_id, paragraph_num)
        if not para_info:
            return {
                "error": f"Параграф {paragraph_num} не найден в учебнике {textbook_id}",
                "questions": []
            }

        skill_id = para_info.get("skill_id")
        topic = para_info.get("topic")
        keywords = para_info.get("keywords", [])
        tb = self.get_textbook(textbook_id)
        grade = tb.get("grade", 7)
        subject = tb.get("subject", "")

        questions = []

        # 1. Поиск в pilot_skills.db по skill_id
        if skill_id:
            dag_items = skill_graph_service.get_items_by_skill(skill_id, limit=limit)
            for item in dag_items:
                formatted_opts = []
                for opt in item.get("options", []):
                    formatted_opts.append({
                        "id": opt["opt_idx"],
                        "text": opt["text"],
                        "is_correct": opt.get("opt_idx") == item.get("correct_idx"),
                        "misc_id": opt.get("misc_id")
                    })
                questions.append({
                    "id": abs(hash(item["item_id"])) % 1000000,
                    "canonical_id": item["item_id"],
                    "text": item["stem"],
                    "options": formatted_opts,
                    "explanation": item.get("explanation", ""),
                    "tier": item.get("tier", 2),
                    "is_boss": item.get("tier", 2) == 3,
                    "time_limit_sec": 15 if item.get("tier", 2) == 1 else (25 if item.get("tier", 2) == 2 else 40),
                    "source": "pilot_skills_dag",
                    "skill_id": skill_id
                })

        # 2. Если нужно больше — добираем из question_bank.db через FTS5
        if len(questions) < limit:
            remaining = limit - len(questions)
            query = topic if topic else (keywords[0] if keywords else "")
            bank_items = bank_service.search_questions(
                query=query,
                subject=subject,
                grade=grade,
                limit=remaining * 2
            )
            for q in bank_items:
                if len(questions) >= limit:
                    break
                # Предотвращаем дублирование
                if any(existing["text"] == q.text for existing in questions):
                    continue
                q_dict = q.model_dump()
                q_dict["tier"] = 2
                q_dict["is_boss"] = False
                q_dict["time_limit_sec"] = 25
                q_dict["source"] = "question_bank_fts5"
                questions.append(q_dict)

        return {
            "textbook_id": textbook_id,
            "textbook_title": tb["title"],
            "paragraph_num": paragraph_num,
            "paragraph_title": para_info["title"],
            "chapter": para_info["chapter"],
            "topic": topic,
            "skill_id": skill_id,
            "count": len(questions),
            "questions": questions[:limit]
        }


textbook_service = TextbookService()
