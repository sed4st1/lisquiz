from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from ..models.schemas import Quiz, Question, AnswerOption, GameRoom
from ..services.room_state_engine import room_state_engine

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])

# Стандартная демонстрационная викторина по умолчанию для быстрого старта
DEMO_DEFAULT_QUIZ = Quiz(
    id="quiz_demo_default",
    title="Математика (5 класс) — Обыкновенные дроби",
    subject="Математика",
    grade=5,
    topic="Обыкновенные дроби",
    questions=[
        Question(
            id=1,
            text="Чему равна сумма $\\frac{1}{4} + \\frac{2}{4}$?",
            explanation="Складываем числители при одинаковом знаменателе: (1 + 2) / 4 = 3/4.",
            time_limit_sec=20,
            topic="Сложение дробей",
            options=[
                AnswerOption(id=0, text="3/4", is_correct=True, symbol="triangle", color="orange"),
                AnswerOption(id=1, text="3/8", is_correct=False, symbol="diamond", color="blue"),
                AnswerOption(id=2, text="2/4", is_correct=False, symbol="circle", color="yellow"),
                AnswerOption(id=3, text="1/2", is_correct=False, symbol="square", color="green"),
            ],
        ),
        Question(
            id=2,
            text="Какая дробь называется правильной?",
            explanation="У правильной дроби числитель строго меньше знаменателя.",
            time_limit_sec=20,
            topic="Понятие правильной дроби",
            options=[
                AnswerOption(id=0, text="Числитель меньше знаменателя", is_correct=True, symbol="triangle", color="orange"),
                AnswerOption(id=1, text="Числитель больше знаменателя", is_correct=False, symbol="diamond", color="blue"),
                AnswerOption(id=2, text="Числитель равен знаменателю", is_correct=False, symbol="circle", color="yellow"),
                AnswerOption(id=3, text="Знаменатель равен 0", is_correct=False, symbol="square", color="green"),
            ],
        ),
        Question(
            id=3,
            text="Сократите дробь $\\frac{6}{8}$ до несократимой:",
            explanation="Делим числитель и знаменатель на 2: получаем 3/4.",
            time_limit_sec=20,
            topic="Основное свойство дроби",
            options=[
                AnswerOption(id=0, text="3/4", is_correct=True, symbol="triangle", color="orange"),
                AnswerOption(id=1, text="1/2", is_correct=False, symbol="diamond", color="blue"),
                AnswerOption(id=2, text="2/3", is_correct=False, symbol="circle", color="yellow"),
                AnswerOption(id=3, text="4/5", is_correct=False, symbol="square", color="green"),
            ],
        ),
    ],
)


class RoomCreateRequest(BaseModel):
    quiz_id: Optional[str] = None
    teacher_name: str = "Учитель"
    teacher_pseudonym_id: str = "teacher_host"


class JoinRoomRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, examples=["Иван К."])
    avatar: Optional[str] = Field("fox_smart", examples=["fox_smart"])
    pseudonym_id: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_room(req: Optional[RoomCreateRequest] = None):
    """Создание новой игровой комнаты учителем с выдачей 6-значного PIN-кода."""
    teacher_name = req.teacher_name if req else "Учитель"
    teacher_p_id = req.teacher_pseudonym_id if req else "teacher_host"

    # Создание комнаты с демо-викториной
    room, teacher_token = await room_state_engine.create_room(
        quiz=DEMO_DEFAULT_QUIZ,
        teacher_name=teacher_name,
        teacher_pseudonym_id=teacher_p_id,
    )

    return {
        "room_code": room.room_code,
        "status": room.status.value,
        "quiz_title": room.quiz.title,
        "teacher_token": teacher_token,
        "ws_url": f"/ws/rooms/{room.room_code}?token={teacher_token}",
    }


@router.get("/{room_code}")
async def get_room_info(room_code: str):
    """Получение публичной информации о комнате перед входом."""
    room = await room_state_engine.get_room(room_code)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Комната с кодом {room_code} не найдена или завершена",
        )

    return {
        "room_code": room.room_code,
        "status": room.status.value,
        "quiz_title": room.quiz.title,
        "total_questions": len(room.quiz.questions),
        "players_count": len(room.players),
    }


@router.post("/{room_code}/join")
async def join_room(room_code: str, req: JoinRoomRequest):
    """Подключение ученика к комнате в лобби."""
    room = await room_state_engine.get_room(room_code)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Комната {room_code} не найдена",
        )

    try:
        player, token = await room_state_engine.join_room(
            room_code=room_code,
            name=req.name,
            avatar=req.avatar,
            pseudonym_id=req.pseudonym_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    return {
        "player_id": player.id,
        "name": player.name,
        "avatar": player.avatar,
        "session_token": token,
        "ws_url": f"/ws/rooms/{room_code}?token={token}",
    }
