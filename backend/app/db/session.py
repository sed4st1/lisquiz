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
        from . import models as _m  # noqa: F401
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            res = await conn.exec_driver_sql("PRAGMA table_info(users)")
            cols = [row[1] for row in res.fetchall()]
            if cols:
                if "streak_days" not in cols:
                    await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN streak_days INTEGER NOT NULL DEFAULT 1")
                if "last_active_date" not in cols:
                    await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN last_active_date VARCHAR(10)")
            # Проверка столбцов в classes
            res_cls = await conn.exec_driver_sql("PRAGMA table_info(classes)")
            cols_cls = [row[1] for row in res_cls.fetchall()]
            if cols_cls:
                if "max_chat_id" not in cols_cls:
                    await conn.exec_driver_sql("ALTER TABLE classes ADD COLUMN max_chat_id VARCHAR(64)")
            # Проверка столбцов в spaced_repetition_queue
            res_sr = await conn.exec_driver_sql("PRAGMA table_info(spaced_repetition_queue)")
            cols_sr = [row[1] for row in res_sr.fetchall()]
            if cols_sr:
                if "question_text" not in cols_sr:
                    await conn.exec_driver_sql("ALTER TABLE spaced_repetition_queue ADD COLUMN question_text TEXT")
                if "explanation" not in cols_sr:
                    await conn.exec_driver_sql("ALTER TABLE spaced_repetition_queue ADD COLUMN explanation TEXT")
                if "options_json" not in cols_sr:
                    await conn.exec_driver_sql("ALTER TABLE spaced_repetition_queue ADD COLUMN options_json JSON")
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
