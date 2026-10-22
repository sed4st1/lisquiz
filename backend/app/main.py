from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from .config import settings
from .db import get_db
from .services import room_state_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: попытка подключения к Redis
    await room_state_engine.init_redis()
    yield
    # Shutdown: корректное закрытие соединений
    await room_state_engine.close()


app = FastAPI(
    title="Лисквиз API",
    description="Бэкенд интерактивных викторин в Сферуме на платформе MAX (Хакатон «Идея фикс» 2026)",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "project": "Лисквиз (Lisquiz)",
        "team": "Вабба-Лабба-Дэдлайн",
        "status": "ready",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    redis_status = "connected" if room_state_engine.redis_available else "fallback_in_memory"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "redis": redis_status,
        "llm_provider": settings.LLM_PROVIDER,
        "max_bot_configured": bool(settings.MAX_BOT_TOKEN)
    }

# Подключение роутеров API
from .api import rooms_router, ws_router, routes_quiz, routes_ml2

app.include_router(rooms_router)
app.include_router(ws_router)
app.include_router(routes_quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(routes_ml2.router, prefix="/api/ml2", tags=["ML 2.0"])


