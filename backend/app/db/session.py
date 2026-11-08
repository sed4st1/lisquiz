from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncEngine,
)
from sqlalchemy.orm import DeclarativeBase
from ..config import settings


class Base(DeclarativeBase):
    """Базовый декларативный класс для всех ORM моделей SQLAlchemy 2.0."""
    pass


def get_engine() -> AsyncEngine:
    """Создание и настройка асинхронного движка SQLAlchemy."""
    connect_args = {}
    if settings.DATABASE_URL.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    return create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        future=True,
        connect_args=connect_args,
    )


engine: AsyncEngine = get_engine()

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


_sqlite_migrated = False


async def _ensure_sqlite_columns():
    global _sqlite_migrated
    if _sqlite_migrated:
        return
    _sqlite_migrated = True
    try:
        async with engine.begin() as conn:
            res = await conn.exec_driver_sql("PRAGMA table_info(users)")
            cols = [row[1] for row in res.fetchall()]
            if cols:
                if "streak_days" not in cols:
                    await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN streak_days INTEGER NOT NULL DEFAULT 1")
                if "last_active_date" not in cols:
                    await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN last_active_date VARCHAR(10)")
    except Exception:
        pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency для получения асинхронной сессии базы данных.
    Гарантирует закрытие сессии и откат при исключениях.
    """
    await _ensure_sqlite_columns()
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
