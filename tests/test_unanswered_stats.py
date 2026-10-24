import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.services.room_state_engine import room_state_engine
from backend.app.models.schemas import Quiz, Question, AnswerOption, AnswerSubmission

@pytest.mark.asyncio
async def test_unanswered_question_not_counted_as_mistake():
    # Setup test quiz with 2 questions
    q1 = Question(
        id=1,
        text="Вопрос 1",
        options=[AnswerOption(id=1, text="Верно", is_correct=True), AnswerOption(id=2, text="Неверно", is_correct=False)]
    )
    q2 = Question(
        id=2,
        text="Вопрос 2",
        options=[AnswerOption(id=1, text="Верно", is_correct=True), AnswerOption(id=2, text="Неверно", is_correct=False)]
    )
    test_quiz = Quiz(
        id="test_stats_quiz",
        title="Тест статистики",
        subject="Математика",
        grade=5,
        topic="Тест",
        questions=[q1, q2]
    )

    room, token = await room_state_engine.create_room(quiz=test_quiz)
    player, _ = await room_state_engine.join_room(room.room_code, name="Ученик 1")

    # Player only answers question 1 correctly, and does NOT answer question 2 (skips/selects nothing)
    sub = AnswerSubmission(
        room_code=room.room_code,
        player_id=player.id,
        question_id=1,
        option_id=1,
        time_taken_sec=2.0
    )
    await room_state_engine.record_answer(sub)

    # Generate gap report
    report = await room_state_engine.generate_gap_report(room.room_code)
    assert report is not None
    # For question 2 where nothing was chosen, mistake_count must be 0
    q2_stat = next(q for q in report.questions_stats if q.question_id == 2)
    assert q2_stat.mistake_count == 0
    assert q2_stat.correct_percent == 100
    # Overall class accuracy should be 100% since 0 errors were made
    assert report.class_accuracy_percent == 100
