# ==============================================================================
# Лисквиз (Lisquiz) — Multi-Stage Production Dockerfile
# Всероссийский хакатон «Идея фикс» (Сферум, VK Образование, Минпросвещения РФ)
# Номинация: «Продвинутая разработка» (Docker)
# ==============================================================================

# ------------------------------------------------------------------------------
# Этап 1: Сборка фронтенд мини-приложения (React 19 + TypeScript + Vite)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Кэширование npm зависимостей
COPY frontend/package*.json ./
RUN npm ci || npm install

# Сборка статических ассетов мини-приложения
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Этап 2: Финальный легковесный образ бэкенда и ML-рантайма (Python 3.12)
# ------------------------------------------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Установка системных утилит и компиляторов
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Установка Python зависимостей с подробным описанием версий
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование серверного кода
COPY backend/ /app/

# Копирование собранного SPA мини-приложения из этапа сборки
COPY --from=frontend-builder /build/dist /app/frontend/dist

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Запуск единого ASGI-сервера Лисквиз
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
