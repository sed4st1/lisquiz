# 🦊 Документация серверной части (Backend) «Лисквиз»

Добро пожаловать в техническую документацию бэкенда интерактивной платформы викторин **«Лисквиз» (Lisquiz)**, разработанной для платформы **MAX (Сферум)** в рамках Всероссийского хакатона «Идея фикс» 2026.

---

## 📚 Навигация по документации бэкенда

В этом разделе собраны все спецификации, схемы и пошаговые планы для реализации и проверки серверной части:

1. **[10-дневный план реализации (BACKEND_ROADMAP_10_DAYS.md)](file:///c:/Progects/LisiyQuiz/docs/backend/BACKEND_ROADMAP_10_DAYS.md)**  
   *Пошаговый день-за-днем план с чек-листами, критериями приемки (DoD) и оценкой рисков.*
2. **[Спецификация API и WebSocket (API_SPECIFICATION.md)](file:///c:/Progects/LisiyQuiz/docs/backend/API_SPECIFICATION.md)**  
   *Все REST эндпоинты (`/api/quiz`, `/api/rooms`, `/api/analytics`, `/api/max`), протокол WebSocket-событий, форматы ошибок и пакет синхронизации `SYNC_STATE`.*
3. **[Схема Базы Данных и Кэша (DATABASE_SCHEMA.md)](file:///c:/Progects/LisiyQuiz/docs/backend/DATABASE_SCHEMA.md)**  
   *ER-диаграмма, описание таблиц PostgreSQL 16 (SQLAlchemy 2.0), индексы, 152-ФЗ Zero-PII и структура ключей Redis 7.*
4. **[Архитектурное исследование (RESEARCH.md)](file:///c:/Progects/LisiyQuiz/docs/architecture/RESEARCH.md)**  
   *Сравнение с Kahoot/Quizizz, математика античита $t_{read}$, метафора «Роща класса», анимации маскота Спринта и юнит-экономика.*

---

## 🛠️ Технологический стек бэкенда

| Компонент | Технология | Обоснование выбора |
| :--- | :--- | :--- |
| **Фреймворк** | **FastAPI 0.115+** | Асинхронная производительность ASGI, автогенерация OpenAPI/Swagger, строгая типизация |
| **Язык** | **Python 3.12** | Новейшие оптимизации производительности CPython, нативная асинхронность |
| **Реальное время** | **WebSockets + asyncio** | Двунаправленная связь для синхронной игры класса (задержка $< 50\text{ мс}$) |
| **Основная СУБД** | **PostgreSQL 16** (asyncpg) | Надежные транзакции, поддержка JSONB для аналитики, отсутствие блокировок SQLite |
| **ORM & Миграции** | **SQLAlchemy 2.0 + Alembic** | Современный асинхронный синтаксис `select()`, строгие типы, версионирование схемы |
| **Кэш и State Store** | **Redis 7** | Хранилище живых комнат в RAM, Sorted Sets для мгновенного лидерборда |
| **ИИ и STEM** | **GigaChat API / YandexGPT / SymPy** | Российские облачные LLM + бесплатный символьный генератор математики |
| **Контейнеризация** | **Docker & Docker Compose** | Изоляция окружения, запуск проекта одной командой (номинация хакатона) |

---

## 📂 Структура папки `backend/`

```text
backend/
├── Dockerfile                  # Multi-stage сборка контейнера на базе python:3.12-slim
├── requirements.txt            # Зависимости Python
└── app/
    ├── main.py                 # Инициализация FastAPI, CORS, middleware, подключение роутеров
    ├── config.py               # Настройки (pydantic-settings), чтение .env
    ├── api/                    # Роутеры API и WebSockets
    │   ├── __init__.py
    │   ├── routes_quiz.py      # CRUD викторин, каталог тем ФРП РФ
    │   ├── routes_rooms.py     # Создание комнат, вход, действия учителя
    │   ├── routes_analytics.py # Отчеты, матрица дефицитов (Class Gap Heatmap)
    │   ├── routes_max.py       # Вебхуки чат-бота MAX, валидация 152-ФЗ
    │   └── websocket.py        # Точка входа WebSocket-соединений комнаты
    ├── db/                     # Слой базы данных
    │   ├── session.py          # Асинхронный движок asyncpg и sessionmaker
    │   └── models.py           # SQLAlchemy 2.0 ORM модели
    ├── models/                 # Схемы валидации данных
    │   └── schemas.py          # Pydantic v2 DTO схемы
    └── services/               # Бизнес-логика и внешние интеграции
        ├── room_service.py     # Управление игровыми комнатами
        ├── ws_manager.py       # Менеджер активных WebSocket соединений
        ├── ai_service.py       # Интеграция с GigaChat / YandexGPT
        ├── stem_generator.py   # Параметрический генератор задач (SymPy)
        ├── analytics_service.py# Анализ пробелов знаний и формирование матрицы
        └── max_bot.py          # Взаимодействие с API платформы MAX Сферум
```

---

## 🚀 Быстрый запуск для разработки

### Через Docker (Рекомендуемый способ):
```bash
# В корне проекта
docker compose up --build -d backend db redis
```
- Документация Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Локально без Docker:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Для Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
