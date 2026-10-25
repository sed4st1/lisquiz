"""add_classes_and_class_students

Revision ID: cc65117f014d
Revises: 69f181b0fcd3
Create Date: 2026-10-24 20:17:23.055053

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cc65117f014d'
down_revision: Union[str, None] = '69f181b0fcd3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create classes table
    op.create_table(
        'classes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('teacher_pseudonym_id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('subject', sa.String(length=100), nullable=False),
        sa.Column('grade', sa.Integer(), nullable=False),
        sa.Column('invite_code', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_classes_invite_code'), 'classes', ['invite_code'], unique=True)
    op.create_index(op.f('ix_classes_teacher_pseudonym_id'), 'classes', ['teacher_pseudonym_id'], unique=False)

    # 2. Create class_students table
    op.create_table(
        'class_students',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('class_id', sa.String(length=36), nullable=False),
        sa.Column('pseudonym_id', sa.String(length=64), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pseudonym_id'], ['users.pseudonym_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_class_students_class_id'), 'class_students', ['class_id'], unique=False)
    op.create_index(op.f('ix_class_students_pseudonym_id'), 'class_students', ['pseudonym_id'], unique=False)
    op.create_index('uq_class_student', 'class_students', ['class_id', 'pseudonym_id'], unique=True)

    # 3. Add class_id to game_rooms
    op.add_column('game_rooms', sa.Column('class_id', sa.String(length=36), nullable=True))
    op.create_index(op.f('ix_game_rooms_class_id'), 'game_rooms', ['class_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_game_rooms_class_id'), table_name='game_rooms')
    op.drop_column('game_rooms', 'class_id')
    op.drop_index('uq_class_student', table_name='class_students')
    op.drop_index(op.f('ix_class_students_pseudonym_id'), table_name='class_students')
    op.drop_index(op.f('ix_class_students_class_id'), table_name='class_students')
    op.drop_table('class_students')
    op.drop_index(op.f('ix_classes_teacher_pseudonym_id'), table_name='classes')
    op.drop_index(op.f('ix_classes_invite_code'), table_name='classes')
    op.drop_table('classes')
