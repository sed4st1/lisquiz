import pytest
import time
from backend.app.models.schemas import (
    Quiz,
    Question,
    AnswerOption,
    AnswerSubmission,
    RoomStatus,
    UserRole,
)
from backend.app.services.room_state_engine import (
    RoomStateEngine,
    InvalidStateTransitionError,
)


@pytest.fixture
def sample_quiz():
    """Тестовая викторина по математике с 2 вопросами."""
    return Quiz(
        id="quiz_test_1",
        title="Тестовая викторина: Обыкновенные дроби",
        subject="Математика",
        grade=5,
        topic="Обыкновенные дроби",
        questions=[
            Question(
                id=1,
                text="Чему равна сумма 1/4 + 2/4?",
                explanation="Складываем числители: 1/4 + 2/4 = 3/4.",
                time_limit_sec=20,
                options=[
                    AnswerOption(id=0, text="3/4", is_correct=True, symbol="triangle", color="orange"),
                    AnswerOption(id=1, text="3/8", is_correct=False, symbol="diamond", color="blue"),
                    AnswerOption(id=2, text="2/4", is_correct=False, symbol="circle", color="yellow"),
                    AnswerOption(id=3, text="1/2", is_correct=False, symbol="square", color="green"),
                ],
            ),
            Question(
                id=2,
                text="Какая дробь называется правильной?",
                explanation="У правильной дроби числитель меньше знаменателя.",
                time_limit_sec=20,
                options=[
                    AnswerOption(id=0, text="Числитель меньше знаменателя", is_correct=True),
                    AnswerOption(id=1, text="Числитель больше знаменателя", is_correct=False),
                    AnswerOption(id=2, text="Знаменатель равен нулю", is_correct=False),
                    AnswerOption(id=3, text="Любая дробь", is_correct=False),
                ],
            ),
        ],
    )


@pytest.fixture
def engine():
    """Инициализация изолированного движка RoomStateEngine."""
    return RoomStateEngine()


@pytest.mark.asyncio
async def test_pin_code_generation(engine):
    """Проверка генерации 6-значных PIN-кодов без коллизий."""
    codes = set()
    for _ in range(50):
        code = await engine.generate_room_code()
        assert len(code) == 6
        assert code.isdigit()
        assert code not in codes
        codes.add(code)


@pytest.mark.asyncio
async def test_create_room_and_sessions(engine, sample_quiz):
    """Проверка создания комнаты учителем и генерации сессионного токена."""
    room, teacher_token = await engine.create_room(
        quiz=sample_quiz,
        teacher_name="Ангелина Валерьевна",
        teacher_pseudonym_id="teach_hash_123",
    )

    assert len(room.room_code) == 6
    assert room.status == RoomStatus.LOBBY
    assert room.current_question_index == 0
    assert room.grove_energy == 0

    session = await engine.get_session(teacher_token)
    assert session is not None
    assert session.role == UserRole.TEACHER
    assert session.room_code == room.room_code
    assert session.name == "Ангелина Валерьевна"


@pytest.mark.asyncio
async def test_join_room_and_player_limits(engine, sample_quiz):
    """Проверка подключения учеников к комнате в лобби."""
    room, _ = await engine.create_room(sample_quiz)

    # Успешный вход ученика
    player, student_token = await engine.join_room(
        room_code=room.room_code,
        name="Иван Кошельник",
        avatar="fox_smart",
        pseudonym_id="anon_stud_01",
    )

    assert player.id.startswith("p_")
    assert player.name == "Иван Кошельник"
    assert player.avatar == "fox_smart"
    assert player.score == 0
    assert player.streak == 0

    session = await engine.get_session(student_token)
    assert session is not None
    assert session.role == UserRole.STUDENT
    assert session.player_id == player.id

    # Проверка лимита в 50 игроков
    for i in range(49):
        await engine.join_room(room_code=room.room_code, name=f"Ученик {i}")

    with pytest.raises(ValueError, match="Комната переполнена"):
        await engine.join_room(room_code=room.room_code, name="Лишний ученик")


@pytest.mark.asyncio
async def test_fsm_valid_lifecycle(engine, sample_quiz):
    """Проверка правильного прохождения стейт-машины жизненного цикла комнаты."""
    room, _ = await engine.create_room(sample_quiz)
    code = room.room_code

    assert room.status == RoomStatus.LOBBY

    # LOBBY -> COUNTDOWN
    st = await engine.start_game(code)
    assert st == RoomStatus.COUNTDOWN

    # COUNTDOWN -> QUESTION
    st = await engine.start_question(code, 0)
    assert st == RoomStatus.QUESTION

    # QUESTION -> REVEAL_RESULTS
    results = await engine.reveal_results(code)
    assert results["correct_option_id"] == 0
    assert room.status == RoomStatus.REVEAL_RESULTS

    # REVEAL_RESULTS -> LEADERBOARD
    lb = await engine.show_leaderboard(code)
    assert lb["is_last_question"] is False
    assert room.status == RoomStatus.LEADERBOARD

    # LEADERBOARD -> COUNTDOWN (следующий вопрос)
    nxt = await engine.next_question(code)
    assert nxt["has_next"] is True
    assert nxt["question_index"] == 1
    assert room.status == RoomStatus.COUNTDOWN

    # Второй вопрос -> REVEAL -> LEADERBOARD -> FINISHED
    await engine.start_question(code, 1)
    await engine.reveal_results(code)
    await engine.show_leaderboard(code)
    fin = await engine.next_question(code)
    assert fin["has_next"] is False
    assert room.status == RoomStatus.FINISHED


@pytest.mark.asyncio
async def test_fsm_invalid_transition(engine, sample_quiz):
    """Проверка блокировки недопустимых переходов состояний FSM."""
    room, _ = await engine.create_room(sample_quiz)
    code = room.room_code

    # Из LOBBY нельзя сразу прыгнуть в QUESTION
    with pytest.raises(InvalidStateTransitionError):
        await engine.transition_state(code, RoomStatus.QUESTION)

    # Из LOBBY нельзя прыгнуть в LEADERBOARD
    with pytest.raises(InvalidStateTransitionError):
        await engine.transition_state(code, RoomStatus.LEADERBOARD)


@pytest.mark.asyncio
async def test_answer_scoring_and_speed_bonus(engine, sample_quiz):
    """Проверка двухфазного скоринга, порога t_read и защиты от кликов наугад."""
    room, _ = await engine.create_room(sample_quiz)
    code = room.room_code

    p1, _ = await engine.join_room(code, "Быстрый Читатель")
    p2, _ = await engine.join_room(code, "Случайный Кликер")

    await engine.start_game(code)
    await engine.start_question(code, 0)

    # p2 кликнул за 0.2 сек (порог t_read не пройден, угадал) -> без скоростного бонуса
    ans_guess = AnswerSubmission(
        room_code=code,
        player_id=p2.id,
        question_id=1,
        option_id=0,
        time_taken_sec=0.2,
        tab_blurred=False,
    )
    res_guess = await engine.record_answer(ans_guess)
    assert res_guess["status"] == "success"
    assert res_guess["is_correct"] is True
    assert res_guess["speed_bonus"] == 0
    assert res_guess["points_awarded"] == 500 + 50  # base + streak

    # p1 прочитал за 3.0 сек (t_read пройден) -> получает базовые + скоростные баллы
    ans_read = AnswerSubmission(
        room_code=code,
        player_id=p1.id,
        question_id=1,
        option_id=0,
        time_taken_sec=3.0,
        tab_blurred=False,
    )
    res_read = await engine.record_answer(ans_read)
    assert res_read["status"] == "success"
    assert res_read["is_correct"] is True
    assert res_read["speed_bonus"] > 300  # высокий бонус за быструю реакцию
    assert res_read["all_answered"] is True  # оба ответили


@pytest.mark.asyncio
async def test_anti_cheat_tab_blurred(engine, sample_quiz):
    """Проверка неинвазивного античита: фиксация расфокуса окна и обнуление бонуса."""
    room, _ = await engine.create_room(sample_quiz)
    code = room.room_code
    player, _ = await engine.join_room(code, "Читер")

    await engine.start_game(code)
    await engine.start_question(code, 0)

    # Ответ с флагом tab_blurred=True
    sub = AnswerSubmission(
        room_code=code,
        player_id=player.id,
        question_id=1,
        option_id=0,
        time_taken_sec=4.0,
        tab_blurred=True,
    )
    res = await engine.record_answer(sub)

    assert res["status"] == "success"
    assert res["blurred_count"] == 1
    assert res["speed_bonus"] == 0  # скоростной бонус аннулирован


@pytest.mark.asyncio
async def test_duplicate_answer_rejection(engine, sample_quiz):
    """Проверка отклонения повторной отправки ответа на один и тот же вопрос."""
    room, _ = await engine.create_room(sample_quiz)
    code = room.room_code
    player, _ = await engine.join_room(code, "Ученик")

    await engine.start_game(code)
    await engine.start_question(code, 0)

    sub = AnswerSubmission(room_code=code, player_id=player.id, question_id=1, option_id=0, time_taken_sec=5.0)
    res1 = await engine.record_answer(sub)
    assert res1["status"] == "success"

    # Повторная попытка
    res2 = await engine.record_answer(sub)
    assert res2["status"] == "error"
    assert res2["code"] == "ALREADY_ANSWERED"


@pytest.mark.asyncio
async def test_reconnection_sync_state(engine, sample_quiz):
    """Проверка генерации снапшота SYNC_STATE для бесшовного восстановления."""
    room, _ = await engine.create_room(sample_quiz)
    code = room.room_code
    player, token = await engine.join_room(code, "Мобильный Ученик")

    await engine.start_game(code)
    await engine.start_question(code, 0)

    # Запрашиваем состояние синхронизации
    sync = await engine.get_sync_state(code, player_id=player.id)
    assert sync is not None
    assert sync.room_code == code
    assert sync.status == RoomStatus.QUESTION
    assert sync.current_question_index == 0
    assert sync.has_answered is False
    assert sync.remaining_time_ms > 0
    # В фазе QUESTION правильные ответы должны быть скрыты от ученика
    assert sync.current_question is not None
    for opt in sync.current_question.options:
        assert opt.is_correct is False


@pytest.mark.asyncio
async def test_class_grove_energy(engine, sample_quiz):
    """Проверка роста командной энергии «Рощи класса» при правильных ответах."""
    room, _ = await engine.create_room(sample_quiz)
    code = room.room_code
    p1, _ = await engine.join_room(code, "Ученик 1")

    await engine.start_game(code)
    await engine.start_question(code, 0)

    assert room.grove_energy == 0

    sub = AnswerSubmission(room_code=code, player_id=p1.id, question_id=1, option_id=0, time_taken_sec=4.0)
    res = await engine.record_answer(sub)

    assert res["is_correct"] is True
    assert res["grove_energy"] > 0
    assert room.grove_energy > 0


@pytest.mark.asyncio
async def test_performance_latency(engine, sample_quiz):
    """Проверка метрики DoD: скорость работы движка в памяти < 2 мс."""
    room, _ = await engine.create_room(sample_quiz)
    code = room.room_code

    start_time = time.perf_counter()
    count = 45
    for i in range(count):
        await engine.join_room(code, f"Тестер {i}")
    elapsed_ms = (time.perf_counter() - start_time) * 1000 / count

    # Среднее время добавления игрока должно быть строго меньше 2 мс
    assert elapsed_ms < 2.0, f"Время отклика {elapsed_ms:.3f} мс превышает порог 2.0 мс"


class MockRedis:
    """Mock асинхронного клиента Redis для тестирования персистентности."""
    def __init__(self):
        self.store = {}
        self.zsets = {}

    async def get(self, key):
        return self.store.get(key)

    async def set(self, key, value, ex=None):
        self.store[key] = value

    async def delete(self, key):
        self.store.pop(key, None)

    async def exists(self, key):
        return 1 if key in self.store else 0

    async def zadd(self, key, mapping):
        if key not in self.zsets:
            self.zsets[key] = {}
        self.zsets[key].update(mapping)

    async def expire(self, key, ex):
        pass


@pytest.mark.asyncio
async def test_redis_sync_and_restore(sample_quiz):
    """Проверка синхронизации в Redis и восстановления состояния при перезагрузке."""
    mock_redis = MockRedis()
    engine_with_redis = RoomStateEngine(redis_client=mock_redis)
    engine_with_redis.redis_available = True

    # Создание комнаты и вход игрока
    room, teacher_token = await engine_with_redis.create_room(sample_quiz, teacher_name="Ангелина")
    code = room.room_code
    player, student_token = await engine_with_redis.join_room(code, "Иван", avatar="fox_1")

    # Проверяем, что в MockRedis появились ключи
    assert f"room:{code}:state" in mock_redis.store
    assert f"session:{teacher_token}" in mock_redis.store
    assert f"session:{student_token}" in mock_redis.store

    # Имитируем перезагрузку сервиса: стираем оперативную память L1
    engine_with_redis.rooms.clear()
    engine_with_redis.sessions.clear()
    assert code not in engine_with_redis.rooms
    assert student_token not in engine_with_redis.sessions

    # Восстановление из L2 (Redis)
    restored_room = await engine_with_redis.get_room(code)
    assert restored_room is not None
    assert restored_room.room_code == code
    assert restored_room.quiz.title == sample_quiz.title
    assert player.id in restored_room.players

    restored_session = await engine_with_redis.get_session(student_token)
    assert restored_session is not None
    assert restored_session.name == "Иван"
    assert restored_session.role == UserRole.STUDENT
