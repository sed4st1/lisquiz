"""add_users_and_auth_tickets

Revision ID: 69f181b0fcd3
Revises: 0001_initial_schema
Create Date: 2026-10-24 18:42:25.524314

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69f181b0fcd3'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Таблица auth_tickets для авторизации через команду /start
    op.create_table(
        'auth_tickets',
        sa.Column('ticket', sa.String(length=36), nullable=False),
        sa.Column('pseudonym_id', sa.String(length=64), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('display_name', sa.String(length=100), nullable=False),
        sa.Column('avatar', sa.String(length=50), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('ticket')
    )
    op.create_index(op.f('ix_auth_tickets_expires_at'), 'auth_tickets', ['expires_at'], unique=False)
    op.create_index(op.f('ix_auth_tickets_pseudonym_id'), 'auth_tickets', ['pseudonym_id'], unique=False)

    # 2. Таблица users для профилей пользователей (152-ФЗ Zero-PII)
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('pseudonym_id', sa.String(length=64), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('display_name', sa.String(length=100), nullable=False),
        sa.Column('avatar', sa.String(length=50), nullable=False),
        sa.Column('auth_provider', sa.String(length=30), nullable=False, default='dev_emulator'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_pseudonym_id'), 'users', ['pseudonym_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_pseudonym_id'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_auth_tickets_pseudonym_id'), table_name='auth_tickets')
    op.drop_index(op.f('ix_auth_tickets_expires_at'), table_name='auth_tickets')
    op.drop_table('auth_tickets')
