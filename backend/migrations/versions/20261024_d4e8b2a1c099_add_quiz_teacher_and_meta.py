"""add quiz teacher and meta

Revision ID: d4e8b2a1c099
Revises: cc65117f014d
Create Date: 2026-10-24 21:26:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e8b2a1c099'
down_revision: Union[str, None] = 'cc65117f014d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. quizzes columns
    op.add_column('quizzes', sa.Column('teacher_pseudonym_id', sa.String(length=64), nullable=True))
    op.add_column('quizzes', sa.Column('group_label', sa.String(length=100), nullable=True))
    op.create_index('idx_quizzes_teacher_pseudonym', 'quizzes', ['teacher_pseudonym_id'])

    # 2. questions columns
    op.add_column('questions', sa.Column('tier', sa.Integer(), server_default='1', nullable=False))
    op.add_column('questions', sa.Column('is_boss', sa.Boolean(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_index('idx_quizzes_teacher_pseudonym', table_name='quizzes')
    op.drop_column('questions', 'is_boss')
    op.drop_column('questions', 'tier')
    op.drop_column('quizzes', 'group_label')
    op.drop_column('quizzes', 'teacher_pseudonym_id')
