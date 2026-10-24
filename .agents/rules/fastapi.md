---
paths:
  - "backend/app/**/*.py"
  - "backend/app/api/**/*.py"
  - "backend/app/services/**/*.py"
---
# FastAPI & Backend Patterns (Lisquiz ECC)

## Архитектурные правила
- Роутеры в `backend/app/api/` — строго «тонкие»: HTTP-статусы, Pydantic-валидация и вызов сервиса.
- Бизнес-логика, математические алгоритмы и работа с SQLite — строго в `backend/app/services/`.
- Использовать `model_dump()` вместо `dict()` (стандарт Pydantic v2).
- Никогда не отдавать клиенту поля секретов, хэшей или приватных токенов.

## Асинхронность
- Не вызывать тяжелые блокирующие синхронные функции внутри `async def`.
- Для внешних LLM/OCR запросов использовать только `httpx.AsyncClient`.
