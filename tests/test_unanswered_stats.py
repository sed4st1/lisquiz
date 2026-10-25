import pytest
from backend.app.services.room_state_engine import room_state_engine
from backend.app.models.schemas import Quiz, Question, AnswerOption, AnswerSubmission

@pytest.mark.asyncio
async def test_unanswered_question_counted_as_mistake():
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

    # Start the game and first question
    await room_state_engine.start_game(room.room_code)
    await room_state_engine.start_question(room.room_code, 0)

    # Player only answers question 1 correctly, and does NOT answer question 2 (skips/selects nothing)
    sub = AnswerSubmission(
        room_code=room.room_code,
        player_id=player.id,
        question_id=1,
        option_id=1,
        time_taken_sec=2.0
    )
    res = await room_state_engine.record_answer(sub)
    assert res.get("status") == "success"

    # Generate gap report
    report = await room_state_engine.generate_gap_report(room.room_code)
    assert report is not None
    # For question 2 where nothing was chosen, mistake_count must be 1
    q2_stat = next(q for q in report.questions_stats if q.question_id == 2)
    assert q2_stat.mistake_count == 1
    assert q2_stat.correct_percent == 0
    # Overall class accuracy should be 50% (1 out of 2 correct)
    assert report.class_accuracy_percent == 50
