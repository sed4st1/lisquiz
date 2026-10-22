from enum import Enum
from datetime import datetime, timezone
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class RoomStatus(str, Enum):
    """Статусы конечного автомата (FSM) игровой комнаты."""
    LOBBY = "lobby"                    # Сбор участников, ожидание старта
    COUNTDOWN = "countdown"            # Обратный отсчет перед вопросом (3 сек)
    QUESTION = "question"              # Вопрос активен, прием ответов учеников
    REVEAL_RESULTS = "reveal_results"  # Время вышло, показ правильного ответа
    LEADERBOARD = "leaderboard"        # Промежуточный лидерборд и Роща класса
    FINISHED = "finished"              # Викторина завершена, Gap Report готов


class UserRole(str, Enum):
    """Роли пользователей в игровой комнате."""
    TEACHER = "teacher"
    STUDENT = "student"


class AnswerOption(BaseModel):
    id: int
    text: str
    is_correct: bool = False
    symbol: Optional[str] = None  # triangle, diamond, circle, square
    color: Optional[str] = None   # orange, blue, yellow, green


class Question(BaseModel):
    id: int
    canonical_id: Optional[int] = None
    text: str
    options: List[AnswerOption]
    explanation: Optional[str] = ""
    time_limit_sec: int = 20
    topic: Optional[str] = None
    grade: Optional[int] = None
    subject: Optional[str] = None
    difficulty: Optional[str] = "medium"
    meta_source: Optional[str] = None

class QuizVariant(BaseModel):
    variant_number: int  # 1, 2, 3, 4
    quiz_id: str
    questions: List[Question]
    question_order: List[int]  # canonical IDs in sequence


class Quiz(BaseModel):
    id: str
    title: str
    subject: str
    grade: int
    topic: str
    questions: List[Question]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: Optional[str] = "bank"  # "bank", "gigachat", "ocr"
    variants: Optional[Dict[int, QuizVariant]] = None


class QuizCreateRequest(BaseModel):
    subject: str = Field(..., examples=["Математика"])
    grade: int = Field(5, ge=1, le=11, examples=[5])
    topic: str = Field(..., examples=["Обыкновенные дроби"])
    question_count: int = Field(5, ge=1, le=20, examples=[5])
    source_notes: Optional[str] = None
    num_variants: int = Field(4, ge=1, le=4, examples=[4])


class Player(BaseModel):
    id: str
    name: str
    avatar: str = "fox_1"
    score: int = 0
    streak: int = 0
    connected: bool = True
    blurred_count: int = 0  # Сворачивание окна (Page Visibility / античит)
    variant_number: int = 1  # Назначенный вариант античита (1, 2, 3, 4)
    pseudonym_id: Optional[str] = None
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SessionData(BaseModel):
    """Данные сессионного токена для быстрой аутентификации и восстановления."""
    session_token: str
    room_code: str
    player_id: str
    role: UserRole = UserRole.STUDENT
    name: str
    avatar: str = "fox_1"
    pseudonym_id: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GameRoom(BaseModel):
    room_code: str
    quiz: Quiz
    status: RoomStatus = RoomStatus.LOBBY
    current_question_index: int = 0
    time_remaining: int = 20
    grove_energy: int = 0  # Энергия «Рощи класса» (0..100)
    teacher_pseudonym_id: str = "teacher_host"
    question_start_epoch_ms: Optional[int] = None
    answered_player_ids: List[str] = []
    players: Dict[str, Player] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnswerSubmission(BaseModel):
    room_code: str
    player_id: str
    question_id: int
    option_id: int
    time_taken_sec: float
    tab_blurred: bool = False


class SyncState(BaseModel):
    """Снапшот синхронизации при переподключении клиента к игре."""
    room_code: str
    status: RoomStatus
    current_question_index: int
    total_questions: int
    remaining_time_ms: int
    has_answered: bool
    grove_energy: int
    player_score: int
    player_streak: int
    blurred_count: int
    current_question: Optional[Question] = None


class QuestionStat(BaseModel):
    question_id: int
    text: str
    correct_percent: int
    topic: str
    mistake_count: int
    dominant_distractor: Optional[str] = None
    cognitive_gap: Optional[str] = None


class GapReport(BaseModel):
    room_code: str
    quiz_title: str
    total_participants: int
    average_score: float
    class_accuracy_percent: int = 0
    grove_growth_percent: int = 0
    questions_stats: List[QuestionStat]
    topics_to_review: List[str]
    homework_recommendation: Optional[str] = None
    flagged_cheaters: List[str] = []
