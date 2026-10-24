import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from backend.app.db.models import (
    QuizModel,
    QuestionModel,
    AnswerOptionModel,
    GameRoomModel,
    RoomParticipantModel,
    PlayerAnswerModel,
    GapReportModel,
    SpacedRepetitionModel,
)


@pytest.mark.asyncio
async def test_create_quiz_with_questions_and_options(db_session):
    """Проверка создания викторины, вложенных вопросов и вариантов ответов."""
    quiz = QuizModel(
        title="Математика (5 класс) — Обыкновенные дроби",
        subject="Математика",
        grade=5,
        topic="Обыкновенные дроби",
        source_notes="Конспект урока 12",
        is_verified=True,
    )
    db_session.add(quiz)
    await db_session.commit()
    await db_session.refresh(quiz)

    assert quiz.id.startswith("quiz_")
    assert quiz.title == "Математика (5 класс) — Обыкновенные дроби"

    # Добавляем вопрос
    q1 = QuestionModel(
        quiz_id=quiz.id,
        order_index=0,
        text="Чему равна сумма 1/4 + 2/4?",
        explanation="Складываем числители: (1+2)/4 = 3/4",
        time_limit_sec=20,
        topic="Сложение дробей",
        kes_code="MATH-5-04",
    )
    db_session.add(q1)
    await db_session.commit()
    await db_session.refresh(q1)

    assert q1.id is not None
    assert q1.quiz_id == quiz.id

    # Добавляем 4 варианта ответов (двойное кодирование)
    opt1 = AnswerOptionModel(question_id=q1.id, text="3/4", is_correct=True, symbol="triangle", color="orange")
    opt2 = AnswerOptionModel(question_id=q1.id, text="3/8", is_correct=False, symbol="diamond", color="blue")
    opt3 = AnswerOptionModel(question_id=q1.id, text="2/4", is_correct=False, symbol="circle", color="yellow")
    opt4 = AnswerOptionModel(question_id=q1.id, text="1/2", is_correct=False, symbol="square", color="green")
    quiz_id = quiz.id
    db_session.add_all([opt1, opt2, opt3, opt4])
    await db_session.commit()

    # В асинхронном SQLAlchemy перезагружаем объект и связи через refresh
    await db_session.refresh(quiz, ["questions"])
    await db_session.refresh(q1, ["options"])

    assert len(quiz.questions) == 1
    assert quiz.questions[0].text == "Чему равна сумма 1/4 + 2/4?"
    assert len(q1.options) == 4
    correct_opt = next(o for o in q1.options if o.is_correct)
    assert correct_opt.text == "3/4"
    assert correct_opt.symbol == "triangle"


@pytest.mark.asyncio
async def test_game_room_and_participants_lifecycle(db_session):
    """Проверка создания комнаты, подключения участников и фиксации ответов."""
    quiz = QuizModel(
        title="Физика (7 класс) — Закон Ома",
        subject="Физика",
        grade=7,
        topic="Закон Ома",
    )
    db_session.add(quiz)
    await db_session.commit()

    # Создание комнаты с 6-значным PIN-кодом
    room = GameRoomModel(
        room_code="482915",
        quiz_id=quiz.id,
        status="lobby",
        teacher_pseudonym_id="teach_hash_abc123",
    )
    db_session.add(room)
    await db_session.commit()

    # Добавление двух участников
    p1 = RoomParticipantModel(
        room_code=room.room_code,
        pseudonym_id="anon_hash_stud_1",
        name="Иван К.",
        avatar="fox_smart",
        score=0,
    )
    p2 = RoomParticipantModel(
        room_code=room.room_code,
        pseudonym_id="anon_hash_stud_2",
        name="Мария С.",
        avatar="owl",
        score=0,
    )
    db_session.add_all([p1, p2])
    await db_session.commit()

    stmt = select(GameRoomModel).where(GameRoomModel.room_code == "482915")
    res = await db_session.execute(stmt)
    loaded_room = res.scalar_one()

    assert len(loaded_room.participants) == 2
    assert loaded_room.status == "lobby"


@pytest.mark.asyncio
async def test_player_answer_and_anti_cheat(db_session):
    """Проверка записи ответа, флага расфокуса (anti-cheat) и начисления очков."""
    quiz = QuizModel(title="Тест", subject="Тест", grade=5, topic="Тест")
    db_session.add(quiz)
    await db_session.commit()

    q = QuestionModel(quiz_id=quiz.id, text="Вопрос 1", time_limit_sec=20)
    db_session.add(q)
    await db_session.commit()

    opt = AnswerOptionModel(question_id=q.id, text="Ответ A", is_correct=True)
    db_session.add(opt)
    await db_session.commit()

    room = GameRoomModel(room_code="112233", quiz_id=quiz.id, status="playing")
    db_session.add(room)
    await db_session.commit()

    participant = RoomParticipantModel(
        room_code=room.room_code,
        pseudonym_id="anon_stud_99",
        name="Алексей",
        avatar="raccoon",
    )
    db_session.add(participant)
    await db_session.commit()

    # Ответ ученика с расфокусом окна
    ans = PlayerAnswerModel(
        room_code=room.room_code,
        participant_id=participant.id,
        question_id=q.id,
        option_id=opt.id,
        is_correct=True,
        time_taken_sec=3.5,
        tab_blurred=True,
        points_awarded=500,
    )
    db_session.add(ans)
    await db_session.commit()

    stmt = select(PlayerAnswerModel).where(PlayerAnswerModel.room_code == "112233")
    res = await db_session.execute(stmt)
    recorded_ans = res.scalar_one()

    assert recorded_ans.is_correct is True
    assert recorded_ans.tab_blurred is True
    assert recorded_ans.points_awarded == 500


@pytest.mark.asyncio
async def test_gap_report_creation(db_session):
    """Проверка формирования и сохранения отчета Class Gap Heatmap."""
    room = GameRoomModel(room_code="998877", status="finished")
    db_session.add(room)
    await db_session.commit()

    report = GapReportModel(
        room_code=room.room_code,
        total_participants=25,
        average_score=1750.0,
        class_accuracy_percent=72,
        grove_growth_percent=85,
        raw_stats_json={
            "questions": [
                {"id": 1, "topic": "Сложение", "correct_pct": 90},
                {"id": 2, "topic": "Деление", "correct_pct": 45, "dominant_distractor": "неверный знак"}
            ]
        },
        topics_to_review=["Деление дробей (вопрос #2)"],
        homework_recommendation="Повторить правила деления обыкновенных дробей.",
        flagged_cheaters=[{"name": "Иван К.", "blurred_count": 2}],
    )
    db_session.add(report)
    await db_session.commit()

    stmt = select(GapReportModel).where(GapReportModel.room_code == "998877")
    res = await db_session.execute(stmt)
    saved_report = res.scalar_one()

    assert saved_report.total_participants == 25
    assert saved_report.class_accuracy_percent == 72
    assert "Деление дробей (вопрос #2)" in saved_report.topics_to_review
    assert len(saved_report.flagged_cheaters) == 1


@pytest.mark.asyncio
async def test_spaced_repetition_queue(db_session):
    """Проверка постановки задачи в очередь интервального повторения (24ч / 72ч)."""
    quiz = QuizModel(title="Тест", subject="Тест", grade=5, topic="Тест")
    db_session.add(quiz)
    await db_session.commit()

    q = QuestionModel(quiz_id=quiz.id, text="Сложный вопрос", topic="Дроби")
    db_session.add(q)
    await db_session.commit()

    trigger_24h = datetime.now(timezone.utc) + timedelta(hours=24)
    item = SpacedRepetitionModel(
        pseudonym_id="hash_stud_error_1",
        question_id=q.id,
        topic="Дроби",
        step_interval=1,
        trigger_at=trigger_24h,
    )
    db_session.add(item)
    await db_session.commit()

    stmt = select(SpacedRepetitionModel).where(SpacedRepetitionModel.pseudonym_id == "hash_stud_error_1")
    res = await db_session.execute(stmt)
    queued_item = res.scalar_one()

    assert queued_item.step_interval == 1
    assert queued_item.is_completed is False
    assert queued_item.topic == "Дроби"
