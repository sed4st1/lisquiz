import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    String,
    Integer,
    BigInteger,
    Boolean,
    Float,
    Text,
    DateTime,
    ForeignKey,
    JSON,
    func,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .session import Base


class QuizModel(Base):
    """Модель проверочной викторины (банк вопросов ФРП)."""
    __tablename__ = "quizzes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: f"quiz_{uuid.uuid4().hex[:8]}")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    grade: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    group_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    teacher_pseudonym_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    source_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Связи
    questions: Mapped[List["QuestionModel"]] = relationship(
        "QuestionModel",
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="QuestionModel.order_index",
        lazy="selectin",
    )
    rooms: Mapped[List["GameRoomModel"]] = relationship(
        "GameRoomModel",
        back_populates="quiz",
        lazy="selectin",
    )


class QuestionModel(Base):
    """Модель вопроса викторины."""
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[str] = mapped_column(String(36), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_limit_sec: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    tier: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_boss: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    topic: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    kes_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Связи
    quiz: Mapped["QuizModel"] = relationship("QuizModel", back_populates="questions")
    options: Mapped[List["AnswerOptionModel"]] = relationship(
        "AnswerOptionModel",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="AnswerOptionModel.id",
        lazy="selectin",
    )
    answers: Mapped[List["PlayerAnswerModel"]] = relationship(
        "PlayerAnswerModel",
        back_populates="question",
        lazy="selectin",
    )


class AnswerOptionModel(Base):
    """Модель варианта ответа (с двойным кодированием: символ + цвет)."""
    __tablename__ = "answer_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    symbol: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # triangle, diamond, circle, square
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)   # orange, blue, yellow, green

    # Связи
    question: Mapped["QuestionModel"] = relationship("QuestionModel", back_populates="options")


class ClassModel(Base):
    """Модель школьного класса (например, 7А, 8Б) для долгосрочной статистики."""
    __tablename__ = "classes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: f"cls_{uuid.uuid4().hex[:8]}")
    teacher_pseudonym_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "7А"
    subject: Mapped[str] = mapped_column(String(100), default="Математика", nullable=False)
    grade: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    invite_code: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)  # e.g. "7A-4829"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Связи
    students: Mapped[List["ClassStudentModel"]] = relationship(
        "ClassStudentModel",
        back_populates="class_group",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    rooms: Mapped[List["GameRoomModel"]] = relationship(
        "GameRoomModel",
        back_populates="class_group",
        lazy="selectin",
    )


class ClassStudentModel(Base):
    """Связующая таблица учеников класса (152-ФЗ Zero-PII)."""
    __tablename__ = "class_students"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    pseudonym_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.pseudonym_id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Связи
    class_group: Mapped["ClassModel"] = relationship("ClassModel", back_populates="students")
    user: Mapped[Optional["UserModel"]] = relationship("UserModel", back_populates="class_memberships")


Index("uq_class_student", ClassStudentModel.class_id, ClassStudentModel.pseudonym_id, unique=True)


class GameRoomModel(Base):
    """Модель игровой сессии (комнаты с 6-значным кодом)."""
    __tablename__ = "game_rooms"

    room_code: Mapped[str] = mapped_column(String(6), primary_key=True)
    quiz_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("quizzes.id", ondelete="SET NULL"), nullable=True, index=True)
    class_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("classes.id", ondelete="SET NULL"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="lobby", nullable=False)  # lobby, playing, finished
    teacher_pseudonym_id: Mapped[str] = mapped_column(String(64), default="teacher_host", nullable=False)
    current_question_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Связи
    quiz: Mapped[Optional["QuizModel"]] = relationship("QuizModel", back_populates="rooms")
    class_group: Mapped[Optional["ClassModel"]] = relationship("ClassModel", back_populates="rooms")
    participants: Mapped[List["RoomParticipantModel"]] = relationship(
        "RoomParticipantModel",
        back_populates="room",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    answers: Mapped[List["PlayerAnswerModel"]] = relationship(
        "PlayerAnswerModel",
        back_populates="room",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    gap_report: Mapped[Optional["GapReportModel"]] = relationship(
        "GapReportModel",
        back_populates="room",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class RoomParticipantModel(Base):
    """Модель участника комнаты (ученика) с псевдонимизацией 152-ФЗ."""
    __tablename__ = "room_participants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: f"p_{uuid.uuid4().hex[:6]}")
    room_code: Mapped[str] = mapped_column(String(6), ForeignKey("game_rooms.room_code", ondelete="CASCADE"), nullable=False, index=True)
    pseudonym_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar: Mapped[str] = mapped_column(String(50), default="fox_1", nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    blurred_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    connected: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Связи
    room: Mapped["GameRoomModel"] = relationship("GameRoomModel", back_populates="participants")
    answers: Mapped[List["PlayerAnswerModel"]] = relationship(
        "PlayerAnswerModel",
        back_populates="participant",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class PlayerAnswerModel(Base):
    """Модель зафиксированного ответа ученика в процессе игры."""
    __tablename__ = "player_answers"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    room_code: Mapped[str] = mapped_column(String(6), ForeignKey("game_rooms.room_code", ondelete="CASCADE"), nullable=False, index=True)
    participant_id: Mapped[str] = mapped_column(String(36), ForeignKey("room_participants.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    option_id: Mapped[int] = mapped_column(Integer, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    time_taken_sec: Mapped[float] = mapped_column(Float, nullable=False)
    tab_blurred: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    points_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Связи
    room: Mapped["GameRoomModel"] = relationship("GameRoomModel", back_populates="answers")
    participant: Mapped["RoomParticipantModel"] = relationship("RoomParticipantModel", back_populates="answers")
    question: Mapped["QuestionModel"] = relationship("QuestionModel", back_populates="answers")


# Составной индекс для быстрой выборки ответов раунда
Index("idx_answers_room_question", PlayerAnswerModel.room_code, PlayerAnswerModel.question_id)


class GapReportModel(Base):
    """Модель итогового отчета с матрицей дефицитов (Class Gap Heatmap)."""
    __tablename__ = "gap_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: f"rep_{uuid.uuid4().hex[:8]}")
    room_code: Mapped[str] = mapped_column(String(6), ForeignKey("game_rooms.room_code", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    total_participants: Mapped[int] = mapped_column(Integer, nullable=False)
    average_score: Mapped[float] = mapped_column(Float, nullable=False)
    class_accuracy_percent: Mapped[int] = mapped_column(Integer, nullable=False)
    grove_growth_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    raw_stats_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    topics_to_review: Mapped[list] = mapped_column(JSON, nullable=False)
    homework_recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    flagged_cheaters: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Связи
    room: Mapped["GameRoomModel"] = relationship("GameRoomModel", back_populates="gap_report")


class SpacedRepetitionModel(Base):
    """Модель очереди задач интервального повторения ошибок (24ч / 72ч)."""
    __tablename__ = "spaced_repetition_queue"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    pseudonym_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    step_interval: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 1 = 24h, 2 = 72h
    trigger_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserModel(Base):
    """Модель пользователя платформы Лисквиз (152-ФЗ Zero-PII контур)."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: f"usr_{uuid.uuid4().hex[:8]}")
    pseudonym_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="student", nullable=False)  # teacher, student
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar: Mapped[str] = mapped_column(String(50), default="fox_smart", nullable=False)
    auth_provider: Mapped[str] = mapped_column(String(30), default="dev_emulator", nullable=False)  # max_bot, dev_emulator
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_login_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Связи
    class_memberships: Mapped[List["ClassStudentModel"]] = relationship(
        "ClassStudentModel",
        back_populates="user",
        lazy="selectin",
    )


class AuthTicketModel(Base):
    """Одноразовый тикет входа по команде /start из чата Сферума (TTL 5-10 минут)."""
    __tablename__ = "auth_tickets"

    ticket: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: f"tkt_{uuid.uuid4().hex[:12]}")
    pseudonym_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="student", nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar: Mapped[str] = mapped_column(String(50), default="fox_smart", nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
