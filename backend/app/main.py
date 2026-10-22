from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings

app = FastAPI(
    title="Лисквиз API",
    description="Бэкенд интерактивных викторин в Сферуме на платформе MAX (Хакатон «Идея фикс» 2026)",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
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
async def health_check():
    return {
        "status": "healthy",
        "llm_provider": settings.LLM_PROVIDER,
        "max_bot_configured": bool(settings.MAX_BOT_TOKEN)
    }

# Подключение роутеров API
from .api import routes_quiz, routes_ml2, routes_grove

app.include_router(routes_quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(routes_ml2.router, prefix="/api/ml2", tags=["ML 2.0"])
app.include_router(routes_grove.router, prefix="/api/grove", tags=["Class Grove"])

