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
    text: str
    options: List[AnswerOption]
    explanation: Optional[str] = ""
    time_limit_sec: int = 20
    topic: Optional[str] = None
    grade: Optional[int] = None
    subject: Optional[str] = None

class Quiz(BaseModel):
    id: str
    title: str
    subject: str
    grade: int
    topic: str
    questions: List[Question]
    created_at: datetime = Field(default_factory=datetime.utcnow)

class QuizCreateRequest(BaseModel):
    subject: str = Field(..., example="Математика")
    grade: int = Field(5, ge=1, le=11, example=5)
    topic: str = Field(..., example="Обыкновенные дроби")
    question_count: int = Field(5, ge=1, le=20, example=5)
    source_notes: Optional[str] = None  # Конспект или текст с доски

class Player(BaseModel):
    id: str
    name: str
    avatar: str = "fox_1"
    score: int = 0
    streak: int = 0
    connected: bool = True
    blurred_count: int = 0  # Сворачивание окна (защита от списывания)

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
