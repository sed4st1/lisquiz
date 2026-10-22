from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class AnswerOption(BaseModel):
    id: int
    text: str
    is_correct: bool = False
    symbol: Optional[str] = None  # triangle, diamond, circle, square
    color: Optional[str] = None   # orange, green, yellow, blue

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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    source: Optional[str] = "bank"  # "bank", "gigachat", "ocr"
    variants: Optional[Dict[int, QuizVariant]] = None

class QuizCreateRequest(BaseModel):
    subject: str = Field(..., example="Математика")
    grade: int = Field(5, ge=1, le=11, example=5)
    topic: str = Field(..., example="Обыкновенные дроби")
    question_count: int = Field(5, ge=1, le=20, example=5)
    source_notes: Optional[str] = None  # Конспект или текст с доски
    num_variants: int = Field(4, ge=1, le=4, example=4)

class Player(BaseModel):
    id: str
    name: str
    avatar: str = "fox_1"
    score: int = 0
    streak: int = 0
    connected: bool = True
    blurred_count: int = 0  # Сворачивание окна (защита от списывания)
    variant_number: int = 1  # Назначенный вариант античита (1, 2, 3, 4)

class GameRoom(BaseModel):
    room_code: str
    quiz: Quiz
    status: str = "lobby"  # lobby, playing, question_results, finished
    current_question_index: int = 0
    time_remaining: int = 20
    players: Dict[str, Player] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AnswerSubmission(BaseModel):
    room_code: str
    player_id: str
    question_id: int
    option_id: int
    time_taken_sec: float
    tab_blurred: bool = False

class QuestionStat(BaseModel):
    question_id: int
    text: str
    correct_percent: int
    topic: str
    mistake_count: int

class GapReport(BaseModel):
    room_code: str
    quiz_title: str
    total_participants: int
    average_score: float
    questions_stats: List[QuestionStat]
    topics_to_review: List[str]
    flagged_cheaters: List[str] = []
