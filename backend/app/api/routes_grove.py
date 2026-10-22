"""
Lisquiz Class Grove 2.0 API Router
===================================
Эндпоинты Классной Рощи, недельных дивизионов, этичной гачи и гибернации:
- GET /api/grove/{class_id} — состояние Рощи и баланс Либиха
- POST /api/grove/{class_id}/apply-session — сохранение результатов сыгранной викторины
- GET /api/grove/{class_id}/leaderboard — дивизионы недели, Топ-1 MVP, Топ-3 и «Прорыв недели»
- POST /api/grove/cards/pull — крутка карточки знаний (этичная гача с Pity)
- GET /api/grove/cards/inventory/{student_id} — инвентарь карточек и баланс желудей
- POST /api/grove/{class_id}/revive — совместный квест пробуждения Рощи
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..services.grove_service import grove_service

router = APIRouter()


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class StudentSessionResult(BaseModel):
    student_id: str
    student_name: str
    avatar: str = "hedgehog"
    points_earned: int = 0
    tier1_correct: int = 0
    tier2_correct: int = 0
    tier3_correct: int = 0
    total_questions: Optional[int] = None


class ApplySessionRequest(BaseModel):
    student_results: List[StudentSessionResult]


class CardPullRequest(BaseModel):
    student_id: str
    cost: int = 50


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/{class_id}")
async def get_grove_state(class_id: str):
    """
    Возвращает статус Классной Рощи:
    - Стадия дерева (семечко -> росток -> саженец -> дерево -> вековой дуб -> цветущее древо)
    - Процент прогресса до следующей стадии
    - Бочка Либиха (соотношение Вода/Гумус/Свет и лимитирующий ресурс)
    - Совет от маскота Спринта
    - Стрик дней и статус гибернации
    """
    grove_data = grove_service.get_or_create_grove(class_id)
    # Проверка гибернации при запросе
    hibernation_info = grove_service.check_and_update_hibernation(class_id)
    grove_data["is_hibernating"] = hibernation_info["is_hibernating"]
    grove_data["revival_quest_active"] = hibernation_info["revival_quest_active"]
    return grove_data


@router.post("/{class_id}/apply-session")
async def apply_quiz_session(class_id: str, request: ApplySessionRequest):
    """
    Пакетно применяет результаты викторины:
    - Обновляет индивидуальные очки учеников
    - Рассчитывает поступление Воды (Tier 1), Гумуса (Tier 2), Света (Tier 3)
    - Активирует бонус биома Либиха (+50% XP при сбалансированном классе)
    - Начисляет валюту «Желуди Знаний» ученикам для гачи
    """
    results_dict = [r.model_dump() if hasattr(r, 'model_dump') else r.dict() for r in request.student_results]
    return grove_service.apply_quiz_session(class_id, results_dict)


@router.get("/{class_id}/leaderboard")
async def get_weekly_leaderboard(class_id: str):
    """
    Возвращает недельный лидерборд класса:
    - 👑 «Совет Дубрав» (Top 25% по очкам недели)
    - 🛡️ «Лесные Стражи» (Middle 50%)
    - 🌱 «Хранители Ростков» (Bottom 25%)
    - 🥇 Топ-1 MVP недели (Золотая рамка аватара)
    - 🥈/🥉 Топ-2 и Топ-3 призёры
    - 🌟 Номинация «Прорыв недели» (Most Improved)
    """
    return grove_service.get_weekly_leaderboard(class_id)


@router.post("/{class_id}/reset-week")
async def reset_weekly_scores(class_id: str):
    """
    Сброс недельных очков (Fresh Start Effect).
    Запускается каждое воскресенье в 23:59.
    Все карточки, all-time очки и бейджи сохраняются.
    """
    return grove_service.reset_weekly_scores(class_id)


@router.post("/cards/pull")
async def pull_card(request: CardPullRequest):
    """
    Крутка карточки знаний в этичной гаче:
    - Стоимость 50 желудей (никакого доната!)
    - Мягкий гарант (Soft-pity) на Epic: 10 круток
    - Жесткий гарант (Hard-pity) на Legendary: 30 круток
    - Кэшбэк 25 желудей при дубликате
    - Научный микро-факт на каждой карточке
    """
    result = grove_service.pull_knowledge_card(request.student_id, cost=request.cost)
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("error", "Ошибка крутки"))
    return result


@router.get("/cards/inventory/{student_id}")
async def get_inventory(student_id: str):
    """
    Возвращает личную коллекцию карточек знаний ученика,
    баланс желудей и прогресс сбора альбома.
    """
    return grove_service.get_student_inventory(student_id)


@router.post("/{class_id}/revive")
async def complete_revival(class_id: str):
    """
    Завершает 3-минутный квест совместного пробуждения:
    - Роща просыпается из гибернации
    - Класс получает +500 XP и бафф «Второе дыхание»
    """
    return grove_service.complete_revival_quest(class_id)
