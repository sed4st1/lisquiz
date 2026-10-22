import json
import re
import logging
from typing import List, Dict, Any, Optional
import httpx
from ..config import settings
from .gigachat_auth import gigachat_auth

logger = logging.getLogger(__name__)

CHAT_COMPLETIONS_ENDPOINT = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"
FALLBACK_ENDPOINT = "https://api.giga.chat/v1/chat/completions"

SYSTEM_PROMPT = """Ты — ведущий эксперт-методист по разработке школьных проверочных викторин по Федеральным рабочим программам (ФРП РФ) Минпросвещения России.

Твоя задача — составить интерактивную викторину для школьников с соблюдением требований:
1. Вопросы должны строго соответствовать возрасту, классу и теме по ФРП РФ.
2. В каждом вопросе ровно 4 варианта ответа в массиве "options".
3. Ровно один вариант правильный. Поле "correct_index" — целое число от 0 до 3.
   КРИТИЧЕСКИ ВАЖНО: options[correct_index] ОБЯЗАН быть правильным ответом!
4. Три остальных варианта (дистракторы) — это типичные ошибки школьников при вычислениях или рассуждениях.
5. Для математических формул обязательно используй LaTeX: пиши ДВОЙНОЙ слэш (например: \\frac{1}{2}, \\sqrt{x}, x^2). Никогда не пиши одинарный слэш перед frac.
6. В "explanation" кратко (1-2 предложения) объясни решение и укажи типичную ошибку.

Пример качественного вывода:
{
  "questions": [
    {
      "text": "Чему равна сумма $\\\\frac{1}{4}$ и $\\\\frac{2}{4}$?",
      "options": ["$\\\\frac{3}{4}$", "$\\\\frac{3}{8}$", "$\\\\frac{1}{4}$", "$\\\\frac{2}{8}$"],
      "correct_index": 0,
      "explanation": "Правильный ответ: $\\\\frac{3}{4}$. При одинаковых знаменателях складываются только числители. Ошибка $\\\\frac{3}{8}$ возникает, когда складывают и знаменатели."
    }
  ]
}

Ответ возвращай ТОЛЬКО в виде валидного JSON без каких-либо вводных слов или Markdown-разметки.
"""

class GigaChatClient:
    """
    Клиент для взаимодействия с моделью генерации текста GigaChat API.
    Поддерживает автоматическую авторизацию, очистку JSON, ремонт LaTeX-экранирования.
    """
    def __init__(self):
        self.model = settings.GIGACHAT_MODEL or "GigaChat"

    def _fix_latex_escapes_in_parsed(self, obj: Any) -> Any:
        """
        Восстанавливает повреждённые escape-последовательности LaTeX (например, \f превратившийся в form feed \x0c).
        """
        if isinstance(obj, str):
            # \x0c -> \f (например \x0crac -> \frac)
            fixed = obj.replace("\x0c", "\\f")
            fixed = fixed.replace("\x08", "\\b")
            fixed = fixed.replace("\a", "\\a")
            fixed = fixed.replace("\v", "\\v")
            return fixed
        elif isinstance(obj, list):
            return [self._fix_latex_escapes_in_parsed(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: self._fix_latex_escapes_in_parsed(v) for k, v in obj.items()}
        return obj

    def _sanitize_and_repair_json(self, raw_content: str) -> Dict[str, Any]:
        """
        Извлекает и ремонтирует JSON из текстового ответа LLM.
        Устраняет Markdown-кодовые блоки, невалидное экранирование слэшей в формулах и т.д.
        """
        text = raw_content.strip()

        # Удаление markdown блоков ```json ... ``` или ``` ... ```
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        # Поиск внешних фигурных скобок { ... }
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            text = match.group(0)

        # Предварительное экранирование LaTeX-команд перед json.loads:
        # \frac, \sqrt, \cdot, \times, \pm, \sum, \alpha, \beta, \gamma, \div
        latex_commands = [
            "frac", "sqrt", "cdot", "times", "pm", "sum", "alpha", "beta",
            "gamma", "delta", "theta", "lambda", "pi", "div", "leq", "geq", "neq", "text"
        ]
        for cmd in latex_commands:
            # Если встречается \cmd (без двойного слэша), заменяем на \\cmd
            text = re.sub(rf'(?<!\\)\\{cmd}', rf'\\\\{cmd}', text)

        # Попытка 1: Прямой парсинг
        try:
            parsed = json.loads(text)
            return self._fix_latex_escapes_in_parsed(parsed)
        except json.JSONDecodeError:
            pass

        # Попытка 2: Ремонт любых некорректно экранированных слэшей
        repaired = re.sub(r'\\(?![/"\\bfnrtu])', r'\\\\', text)
        try:
            parsed = json.loads(repaired)
            return self._fix_latex_escapes_in_parsed(parsed)
        except json.JSONDecodeError as err:
            logger.error("Не удалось распарсить JSON от GigaChat: %s\nСырой текст:\n%s", err, raw_content)
            raise ValueError(f"Ответ модели не является валидным JSON: {err}")

    async def generate_quiz_raw(
        self,
        subject: str,
        grade: int,
        topic: str,
        question_count: int = 5,
        source_notes: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Запрашивает у GigaChat структурированные вопросы по предмету и теме.
        Возвращает список сырых словарей вопросов.
        """
        token = await gigachat_auth.get_token()

        user_content = (
            f"Предмет: {subject}\n"
            f"Класс: {grade}\n"
            f"Тема: {topic}\n"
            f"Количество вопросов: {question_count}\n"
        )
        if source_notes:
            user_content += f"\nДополнительный материал урока (конспект/текст с доски):\n{source_notes}\n"

        user_content += f"\nСгенерируй ровно {question_count} вопросов в формате JSON."

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.4,
            "top_p": 0.9,
            "stream": False
        }

        # Выполняем запрос с возможностью повторной попытки при 401
        for attempt in range(2):
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }

            async with httpx.AsyncClient(verify=False, timeout=45.0) as client:
                try:
                    response = await client.post(CHAT_COMPLETIONS_ENDPOINT, headers=headers, json=payload)
                except httpx.ConnectError:
                    # Резервный эндпоинт
                    logger.warning("Основной эндпоинт недоступен, пробуем резервный...")
                    response = await client.post(FALLBACK_ENDPOINT, headers=headers, json=payload)

                if response.status_code == 401 and attempt == 0:
                    logger.warning("Токен GigaChat устарел или отозван (401), обновляем...")
                    token = await gigachat_auth.get_token(force_refresh=True)
                    continue

                response.raise_for_status()
                data = response.json()
                raw_text = data["choices"][0]["message"]["content"]
                parsed_json = self._sanitize_and_repair_json(raw_text)

                questions = parsed_json.get("questions", [])
                if not questions:
                    raise ValueError("JSON ответа не содержит массив 'questions'")

                return questions

        raise RuntimeError("Не удалось получить корректный ответ от GigaChat после обновления токена.")

    async def upload_file(self, file_bytes: bytes, filename: str = "document.png") -> str:
        """
        Загружает файл (изображение или документ) в защищенное хранилище GigaChat API.
        Возвращает идентификатор файла (UUID).
        """
        token = await gigachat_auth.get_token()
        headers = {"Authorization": f"Bearer {token}"}
        files = {
            "file": (filename, file_bytes, "image/png"),
            "purpose": (None, "general")
        }
        endpoints = [
            "https://gigachat.devices.sberbank.ru/api/v1/files",
            "https://api.giga.chat/v1/files"
        ]
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            last_err = None
            for ep in endpoints:
                try:
                    resp = await client.post(ep, headers=headers, files=files)
                    if resp.status_code == 200:
                        file_id = resp.json().get("id")
                        logger.info("Файл успешно загружен в GigaChat Vision API (ID: %s)", file_id)
                        return file_id
                    last_err = resp.text
                except Exception as e:
                    last_err = str(e)
            raise RuntimeError(f"Не удалось загрузить файл в GigaChat API: {last_err}")

    async def generate_quiz_from_image_raw(
        self,
        image_bytes: bytes,
        subject: str,
        grade: int,
        topic: Optional[str] = None,
        question_count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Мультимодальная генерация викторины по прикрепленному изображению (Vision LLM GigaChat-Pro).
        """
        file_id = await self.upload_file(image_bytes, "textbook_page.png")
        token = await gigachat_auth.get_token()

        resolved_topic = topic or f"материал с прикрепленной страницы ({subject})"
        user_content = (
            f"Предмет: {subject}\n"
            f"Класс: {grade}\n"
            f"Тема: {resolved_topic}\n"
            f"Внимательно прочитай материал на прикрепленном изображении страницы учебника или конспекта. "
            f"Сгенерируй ровно {question_count} вопросов викторины, проверяющих понимание материала с этого фото. "
            f"Строго соблюдай формат JSON."
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content, "attachments": [file_id]}
        ]

        # Для анализа визуальных данных используется GigaChat-Pro
        payload = {
            "model": "GigaChat-Pro",
            "messages": messages,
            "temperature": 0.3,
            "stream": False
        }

        for attempt in range(2):
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            async with httpx.AsyncClient(verify=False, timeout=50.0) as client:
                try:
                    response = await client.post(CHAT_COMPLETIONS_ENDPOINT, headers=headers, json=payload)
                except httpx.ConnectError:
                    response = await client.post(FALLBACK_ENDPOINT, headers=headers, json=payload)

                if response.status_code == 401 and attempt == 0:
                    token = await gigachat_auth.get_token(force_refresh=True)
                    continue

                response.raise_for_status()
                data = response.json()
                raw_text = data["choices"][0]["message"]["content"]
                parsed_json = self._sanitize_and_repair_json(raw_text)
                questions = parsed_json.get("questions", [])
                if not questions:
                    raise ValueError("JSON ответа не содержит массив 'questions'")
                return questions

        raise RuntimeError("Не удалось сгенерировать викторину по изображению через GigaChat Vision.")

    async def synthesize_distractors(
        self,
        raw_condition: str,
        correct_answer: str,
        topic: str = "Русский язык",
        subject: str = "Русский язык"
    ) -> Dict[str, Any]:
        """
        Синтез 3 методически правдоподобных дистракторов для сырого задания ОГЭ/ЕГЭ.
        Превращает открытый вопрос в полноценный 1-из-4 тест для смартфона.
        """
        token = await gigachat_auth.get_token()

        system_prompt = (
            "Ты — опытный методист и составитель тестов по стандартам ФГОС РФ. "
            "На основе предоставленного задания и правильного ответа сформируй ровно 3 правдоподобных альтернативных варианта (дистрактора). "
            "Требования:\n"
            "1. Формулировка вопроса должна быть краткой и четкой (до 200 символов).\n"
            "2. Варианты ответов должны быть компактными (до 50 символов каждый).\n"
            "3. Дистракторы должны отражать типичные ошибки школьников, но оставаться однозначно неверными.\n"
            "4. Варианты ответов должны быть согласованы по длине и грамматической форме.\n"
            "Верни ответ ТОЛЬКО в виде валидного JSON-объекта:\n"
            "{\n"
            '  "question_text": "...",\n'
            '  "correct_option": "...",\n'
            '  "distractor_1": "...",\n'
            '  "distractor_2": "...",\n'
            '  "distractor_3": "...",\n'
            '  "explanation": "..."\n'
            "}"
        )

        user_content = (
            f"Дисциплина: {subject}\n"
            f"Тема: {topic}\n"
            f"Условие задания: {raw_condition}\n"
            f"Правильный ответ: {correct_answer}\n"
            "Сгенерируй вопрос и 3 дистрактора в JSON."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "stream": False
        }

        for attempt in range(2):
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            async with httpx.AsyncClient(verify=False, timeout=40.0) as client:
                try:
                    response = await client.post(CHAT_COMPLETIONS_ENDPOINT, headers=headers, json=payload)
                except httpx.ConnectError:
                    response = await client.post(FALLBACK_ENDPOINT, headers=headers, json=payload)

                if response.status_code == 401 and attempt == 0:
                    token = await gigachat_auth.get_token(force_refresh=True)
                    continue

                response.raise_for_status()
                data = response.json()
                raw_text = data["choices"][0]["message"]["content"]
                parsed = self._sanitize_and_repair_json(raw_text)
                return parsed

        raise RuntimeError("Не удалось сгенерировать дистракторы через GigaChat.")

gigachat_client = GigaChatClient()
