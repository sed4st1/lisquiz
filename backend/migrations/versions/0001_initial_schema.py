"""0001_initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. quizzes
    op.create_table(
        "quizzes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=False),
        sa.Column("grade", sa.Integer(), nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=False),
        sa.Column("source_notes", sa.Text(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_quizzes_subject_grade", "quizzes", ["subject", "grade"])

    # 2. questions
    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("quiz_id", sa.String(length=36), sa.ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_index", sa.Integer(), default=0, nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("time_limit_sec", sa.Integer(), default=20, nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=True),
        sa.Column("kes_code", sa.String(length=50), nullable=True),
    )
    op.create_index("idx_questions_quiz_id", "questions", ["quiz_id"])

    # 3. answer_options
    op.create_table(
        "answer_options",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), default=False, nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=True),
        sa.Column("color", sa.String(length=20), nullable=True),
    )
    op.create_index("idx_options_question_id", "answer_options", ["question_id"])

    # 4. game_rooms
    op.create_table(
        "game_rooms",
        sa.Column("room_code", sa.String(length=6), primary_key=True),
        sa.Column("quiz_id", sa.String(length=36), sa.ForeignKey("quizzes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(length=20), default="lobby", nullable=False),
        sa.Column("teacher_pseudonym_id", sa.String(length=64), default="teacher_host", nullable=False),
        sa.Column("current_question_index", sa.Integer(), default=0, nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_game_rooms_quiz_id", "game_rooms", ["quiz_id"])

    # 5. room_participants
    op.create_table(
        "room_participants",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("room_code", sa.String(length=6), sa.ForeignKey("game_rooms.room_code", ondelete="CASCADE"), nullable=False),
        sa.Column("pseudonym_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("avatar", sa.String(length=50), default="fox_1", nullable=False),
        sa.Column("score", sa.Integer(), default=0, nullable=False),
        sa.Column("streak", sa.Integer(), default=0, nullable=False),
        sa.Column("blurred_count", sa.Integer(), default=0, nullable=False),
        sa.Column("connected", sa.Boolean(), default=True, nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_room_participants_room_code", "room_participants", ["room_code"])
    op.create_index("idx_room_participants_pseudonym_id", "room_participants", ["pseudonym_id"])

    # 6. player_answers
    op.create_table(
        "player_answers",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("room_code", sa.String(length=6), sa.ForeignKey("game_rooms.room_code", ondelete="CASCADE"), nullable=False),
        sa.Column("participant_id", sa.String(length=36), sa.ForeignKey("room_participants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("option_id", sa.Integer(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("time_taken_sec", sa.Float(), nullable=False),
        sa.Column("tab_blurred", sa.Boolean(), default=False, nullable=False),
        sa.Column("points_awarded", sa.Integer(), default=0, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_answers_room_question", "player_answers", ["room_code", "question_id"])

    # 7. gap_reports
    op.create_table(
        "gap_reports",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("room_code", sa.String(length=6), sa.ForeignKey("game_rooms.room_code", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("total_participants", sa.Integer(), nullable=False),
        sa.Column("average_score", sa.Float(), nullable=False),
        sa.Column("class_accuracy_percent", sa.Integer(), nullable=False),
        sa.Column("grove_growth_percent", sa.Integer(), default=0, nullable=False),
        sa.Column("raw_stats_json", sa.JSON(), nullable=False),
        sa.Column("topics_to_review", sa.JSON(), nullable=False),
        sa.Column("homework_recommendation", sa.Text(), nullable=False),
        sa.Column("flagged_cheaters", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 8. spaced_repetition_queue
    op.create_table(
        "spaced_repetition_queue",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("pseudonym_id", sa.String(length=64), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=False),
        sa.Column("step_interval", sa.Integer(), default=1, nullable=False),
        sa.Column("trigger_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_completed", sa.Boolean(), default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_spaced_rep_pseudonym", "spaced_repetition_queue", ["pseudonym_id"])
    op.create_index("idx_spaced_rep_trigger", "spaced_repetition_queue", ["trigger_at"])


def downgrade() -> None:
    op.drop_table("spaced_repetition_queue")
    op.drop_table("gap_reports")
    op.drop_table("player_answers")
    op.drop_table("room_participants")
    op.drop_table("game_rooms")
    op.drop_table("answer_options")
    op.drop_table("questions")
    op.drop_table("quizzes")
