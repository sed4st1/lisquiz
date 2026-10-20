# 🦊 Лисквиз (Lisquiz) — Интерактивные викторины в Сферуме

[![Хакатон](https://img.shields.io/badge/Хакатон-«Идея%20фикс»%202026-brightgreen)](https://dev.max.ru)
[![Номинация](https://img.shields.io/badge/Номинация-Продвинутая%20разработка%20(Docker)-blue)](https://docker.com)
[![Стек](https://img.shields.io/badge/Стек-FastAPI%20%7C%20React%20%7C%20Docker-orange)]()

Сервис интерактивных экспресс-викторин внутри **Сферума** на платформе **MAX**, который за 30 секунд генерирует проверочные викторины по темам Федеральных рабочих программ с помощью ИИ, проводит живую игру в классе с защитой от списывания и формирует наглядную карту пробелов для учителя.

---

## 👥 Команда «Вабба-Лабба-Дэдлайн»
*ГБПОУ РО «Ростовский-на-Дону колледж связи и информатики» (РКСИ)*

- **Шабалта Ангелина Валерьевна** — Педагог-руководитель, капитан команды (методика, тестирование)
- **Кошельник Иван Игоревич** — ML-разработчик (генерация и валидация вопросов ИИ, банк тем ФРП)
- **Моргунов Ростислав Максимович** — Backend-разработчик (FastAPI, WebSockets, БД, Redis, Docker)
- **Глазов Руслан Андреевич** — UI/UX дизайнер (макеты экранов, маскот лисёнок «Спринт»)
- **[Lunarflux-hub](https://github.com/Lunarflux-hub)** — Контрибьютор / Разработка

---

## 📁 Структура проекта

```text
.
├── docker-compose.yml        # Оркестрация контейнеров (backend, frontend, postgres, redis)
├── Dockerfile                # Корневой Dockerfile сборки бэкенда
├── requirements.txt          # Описание Python-библиотек и версий (требование хакатона)
├── .env.example              # Пример файла переменных окружения
├── .gitignore                # Исключения версионного контроля
├── backend/                  # Серверная часть (FastAPI, WebSockets)
│   ├── Dockerfile            # Dockerfile для бэкенда
│   ├── requirements.txt      # Зависимости Python
│   └── app/
│       ├── main.py           # Точка входа FastAPI приложения
│       ├── config.py         # Настройки и переменные окружения
│       ├── api/              # Эндпоинты (викторины, комнаты, бот MAX, WebSockets)
│       ├── models/           # Схемы данных Pydantic / ORM
│       └── services/         # Сервисы (ИИ GigaChat/YandexGPT, игровые комнаты)
├── frontend/                 # Клиентская часть (React, TypeScript, Vite)
│   ├── Dockerfile            # Multi-stage сборка (Node.js -> Nginx)
│   ├── nginx.conf            # Конфигурация Nginx с проксированием /api и /ws
│   ├── package.json          # Зависимости интерфейса
│   └── src/                  # Исходный код мини-приложения Сферум (MAX)
└── docs/                     # Материалы проекта
    ├── architecture/         # Архитектурное исследование и спецификация (RESEARCH.md)
    ├── anketa/               # Анкета 1 этапа хакатона
    ├── presentation/         # Слайды презентации и дизайн-макеты экранов
    └── guide/                # Документация и требования хакатона
```

---

## 🌿 Структура веток репозитория (Git Branching)

- **`main`** — Стабильная версия (production MVP) для проверки экспертами хакатона.
- **`develop`** — Основная ветка для интеграции и тестирования компонентов.
- **`feature/backend`** — Разработка серверной логики, WebSocket комнат и БД (*Ростислав*).
- **`feature/frontend`** — Разработка пользовательского интерфейса мини-приложения MAX (*Руслан*).
- **`feature/ml-ai`** — Интеграция с моделями генерации вопросов GigaChat / YandexGPT (*Иван*).
- **`feature/max-bot`** — Интеграция чат-бота с платформой MAX Сферум.

---

## 🚀 Инструкция по запуску с помощью Docker (Рекомендуемый способ)

### 1. Предварительные требования
- Установленный [Docker](https://www.docker.com/) и плагин `docker-compose`.
- Склонированный репозиторий:
  ```bash
  git clone https://github.com/sed4st1/lisquiz.git
  cd lisquiz
  ```

### 2. Настройка переменных окружения
Скопируйте пример файла конфигурации:
```bash
cp .env.example .env
```
*(При необходимости укажите токен бота MAX или ключи LLM. По умолчанию включен режим `LLM_PROVIDER=mock`, позволяющий тестировать систему без внешних ключей).*

### 3. Сборка и запуск контейнеров
Запустите все сервисы командой:
```bash
docker compose up --build -d
```

### 4. Проверка работы сервисов
После запуска будут доступны:
- 🌐 **Мини-приложение (Frontend):** [http://localhost:3000](http://localhost:3000)
- ⚙️ **API Бэкенд:** [http://localhost:8000](http://localhost:8000)
- 📚 **Интерактивная документация Swagger/OpenAPI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- 🩺 **Health Check эндпоинт:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

Остановка контейнеров:
```bash
docker compose down
```

---

## 💻 Локальный запуск без Docker (для разработки)

### Бэкенд (Python 3.12+):
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

### Фронтенд (Node.js 20+):
```bash
cd frontend
npm install
npm run dev
```

---

## 🔗 Подключение к платформе MAX (Сферум)
1. Токен бота получен от чат-бота **«Идея фикс»** и указывается в параметре `MAX_BOT_TOKEN` в `.env`.
2. URL вебхука бота настраивается на: `https://<ваш_домен>/api/max/webhook`.
3. Мини-приложение регистрируется в консоли разработчика MAX [dev.max.ru](https://dev.max.ru/docs).
