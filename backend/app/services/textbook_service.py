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
        3. Если задач недостаточно -> добираем генератором (SymPy).
        """
        tb = self.get_textbook(textbook_id)
        if not tb:
            return {
                "error": f"Учебник {textbook_id} не найден",
                "questions": []
            }

        para_info = self.find_paragraph(textbook_id, paragraph_num)
        if not para_info:
            # Fallback к первому доступному параграфу учебника
            for section in tb.get("sections", []):
                if section.get("paragraphs"):
                    para_info = self.find_paragraph(textbook_id, section["paragraphs"][0]["num"])
                    break
            if not para_info:
                para_info = {
                    "textbook_id": tb["id"],
                    "textbook_title": tb["title"],
                    "chapter": "Глава 1",
                    "paragraph_num": paragraph_num,
                    "title": f"§ {paragraph_num}",
                    "skill_id": None,
                    "topic": tb.get("subject", "Предмет"),
                    "keywords": [tb.get("subject", "")]
                }

        skill_id = para_info.get("skill_id")
        topic = para_info.get("topic") or para_info.get("title")
        keywords = para_info.get("keywords", [])
        grade = tb.get("grade", 7)
        subject = tb.get("subject", "")

        # Маппинг предметов для расширенного поиска в question_bank.db
        bank_subjects = [subject]
        if subject in ("Алгебра", "Геометрия"):
            bank_subjects.append("Математика")
        elif subject == "Математика":
            bank_subjects.extend(["Алгебра", "Геометрия"])

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
            candidates = []

            for b_subj in bank_subjects:
                if len(candidates) >= remaining:
                    break
                # Поиск с фильтром класса
                if topic:
                    candidates.extend(bank_service.search_questions(query=topic, subject=b_subj, grade=grade, limit=remaining * 2))
                if len(candidates) < remaining and keywords:
                    for kw in keywords:
                        more = bank_service.search_questions(query=kw, subject=b_subj, grade=grade, limit=remaining)
                        candidates.extend(more)
                        if len(candidates) >= remaining:
                            break

                # Если не найдено с фильтром класса — ищем без привязки к классу
                if len(candidates) < remaining:
                    if topic:
                        candidates.extend(bank_service.search_questions(query=topic, subject=b_subj, grade=None, limit=remaining * 2))
                    if len(candidates) < remaining and keywords:
                        for kw in keywords:
                            more = bank_service.search_questions(query=kw, subject=b_subj, grade=None, limit=remaining)
                            candidates.extend(more)
                            if len(candidates) >= remaining:
                                break

            # Если всё ещё не хватает — берём по теме из банка
            if len(candidates) < remaining:
                topic_match = topic or (keywords[0] if keywords else "Общая")
                for b_subj in bank_subjects:
                    more = bank_service.get_questions_by_topic(subject=b_subj, grade=grade, topic=topic_match, count=remaining)
                    candidates.extend(more)
                    if len(candidates) >= remaining:
                        break

            for q in candidates:
                if len(questions) >= limit:
                    break
                if any(existing["text"] == q.text for existing in questions):
                    continue
                q_dict = q.model_dump()
                q_dict["tier"] = 2
                q_dict["is_boss"] = False
                q_dict["time_limit_sec"] = 25
                q_dict["source"] = "question_bank_fts5"
                questions.append(q_dict)

        # 3. Добор через SymPy STEM-генератор Ивана
        if len(questions) < limit and subject in ("Математика", "Алгебра", "Физика"):
            try:
                from .sympy_math_engine import sympy_math_engine
                needed = limit - len(questions)
                if subject in ("Математика", "Алгебра"):
                    stem_items = sympy_math_engine.generate_pilot_corpus(skills=["M6.FRAC.MUL", "M6.PROP.SOLVE"], per_skill=needed)
                else:
                    stem_items = sympy_math_engine.generate_pilot_corpus(skills=["P7.DENS.CALC", "P7.ARCH.COND"], per_skill=needed)
                
                for s_item in stem_items:
                    if len(questions) >= limit:
                        break
                    s_opts = [
                        {"id": opt["opt_idx"], "text": opt["text"], "is_correct": opt.get("opt_idx") == s_item.get("correct_idx")}
                        for opt in s_item.get("options", [])
                    ]
                    questions.append({
                        "id": abs(hash(s_item["item_id"])) % 1000000,
                        "canonical_id": s_item["item_id"],
                        "text": s_item["stem"],
                        "options": s_opts,
                        "explanation": s_item.get("explanation", ""),
                        "tier": 2,
                        "is_boss": False,
                        "time_limit_sec": 25,
                        "source": "sympy_stem_engine"
                    })
            except Exception as se:
                logger.warning("Sympy STEM fallback error: %s", se)

        # Отмечаем последний вопрос как Босс-вопрос (Tier 3 🔥)
        if len(questions) >= 3:
            questions[-1]["tier"] = 3
            questions[-1]["is_boss"] = True
            questions[-1]["time_limit_sec"] = 35

        return {
            "textbook_id": textbook_id,
            "textbook_title": tb["title"],
            "paragraph_num": para_info["paragraph_num"],
            "paragraph_title": para_info["title"],
            "chapter": para_info["chapter"],
            "topic": topic,
            "skill_id": skill_id,
            "count": len(questions),
            "questions": questions[:limit]
        }

    def get_preset_textbook_quizzes(self) -> List[Dict[str, Any]]:
        """
        Возвращает 6 готовых к запуску проверенных викторин по главным учебникам РФ.
        Каждая викторина полностью укомплектована реальными вопросами из базы Ивана.
        """
        presets_config = [
            ("peryshkin_phys_7", 22, "Физика", 7, "§ 22. Расчет массы и плотности", "Пёрышкин А.В."),
            ("vilenkin_math_6", 7, "Математика", 6, "§ 7. Сложение и вычитание дробей", "Виленкин Н.Я."),
            ("merzlyak_math_6", 8, "Математика", 6, "§ 8. Отношения и пропорции", "Мерзляк А.Г."),
            ("makarychev_alg_7", 3, "Алгебра", 7, "§ 3. Выражения с переменными", "Макарычев Ю.Н."),
            ("atanasyan_geom_7_9", 2, "Геометрия", 7, "§ 2. Измерение отрезков", "Атанасян Л.С."),
            ("ladyzhenskaya_rus_6", 12, "Русский язык", 6, "§ 12. Морфемика и словообразование", "Ладыженская Т.А."),
        ]
        res = []
        for tb_id, p_num, subj, grade, title, author in presets_config:
            q_res = self.get_questions_by_paragraph(tb_id, p_num, limit=5)
            q_list = q_res.get("questions", [])
            formatted_questions = []
            for idx, q in enumerate(q_list):
                formatted_questions.append({
                    "id": idx + 1,
                    "text": q["text"],
                    "explanation": q.get("explanation", ""),
                    "time_limit_sec": q.get("time_limit_sec", 20),
                    "tier": q.get("tier", 1 if idx == 0 else (3 if idx == len(q_list) - 1 else 2)),
                    "is_boss": q.get("is_boss", idx == len(q_list) - 1),
                    "topic": q_res.get("topic", title),
                    "options": [
                        {
                            "id": o["id"],
                            "text": o["text"],
                            "is_correct": bool(o.get("is_correct")),
                        }
                        for o in q.get("options", [])
                    ]
                })

            res.append({
                "id": f"quiz_tb_{tb_id}_p{p_num}",
                "textbook_id": tb_id,
                "paragraph_num": p_num,
                "title": f"{author}: {title}",
                "subject": subj,
                "grade": grade,
                "topic": title,
                "author": author,
                "group_label": f"{author.split()[0]} {grade} кл",
                "is_active": tb_id == "peryshkin_phys_7",
                "questions": formatted_questions,
                "count": len(formatted_questions),
            })
        return res


textbook_service = TextbookService()
