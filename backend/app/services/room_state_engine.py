import asyncio
import json
import logging
import math
import secrets
import time
from typing import Dict, List, Optional, Tuple
import redis.asyncio as aioredis
from ..config import settings
from ..models.schemas import (
    GameRoom,
    Quiz,
    Question,
    Player,
    SessionData,
    AnswerSubmission,
    RoomStatus,
    UserRole,
    SyncState,
    GapReport,
    QuestionStat,
)
from .adaptive_engine import adaptive_engine
from .remediation_engine import remediation_engine

logger = logging.getLogger(__name__)


class InvalidStateTransitionError(Exception):
    """Исключение при попытке некорректного перехода статуса комнаты (FSM)."""
    pass


# Допустимые переходы конечного автомата жизненного цикла комнаты
VALID_TRANSITIONS: Dict[RoomStatus, List[RoomStatus]] = {
    RoomStatus.LOBBY: [RoomStatus.COUNTDOWN, RoomStatus.FINISHED],
    RoomStatus.COUNTDOWN: [RoomStatus.QUESTION, RoomStatus.REVEAL_RESULTS, RoomStatus.LEADERBOARD, RoomStatus.FINISHED],
    RoomStatus.QUESTION: [RoomStatus.REVEAL_RESULTS, RoomStatus.LEADERBOARD, RoomStatus.COUNTDOWN, RoomStatus.FINISHED],
    RoomStatus.REVEAL_RESULTS: [RoomStatus.LEADERBOARD, RoomStatus.COUNTDOWN, RoomStatus.FINISHED],
    RoomStatus.LEADERBOARD: [RoomStatus.COUNTDOWN, RoomStatus.REVEAL_RESULTS, RoomStatus.FINISHED],
    RoomStatus.FINISHED: [RoomStatus.LOBBY, RoomStatus.COUNTDOWN],
}


class RoomStateEngine:
    """
    Высокопроизводительный движок управления состоянием живых игровых комнат.
    - L1: In-Memory (Python dict + asyncio.Lock per room) со временем отклика < 2 мс.
    - L2: Redis Key-Value Store с TTL 4 часа для комнат и 12 часов для сессий.
    - Graceful Fallback: работает в памяти, даже если Redis временно недоступен.
    """

    def __init__(self, redis_client: Optional[aioredis.Redis] = None):
        self.rooms: Dict[str, GameRoom] = {}
        self.room_locks: Dict[str, asyncio.Lock] = {}
        self.sessions: Dict[str, SessionData] = {}
        self.answers: Dict[str, List[AnswerSubmission]] = {}
        self.redis_client = redis_client
        self.redis_available: bool = False

    def get_room_lock(self, room_code: str) -> asyncio.Lock:
        """Получение или создание атомарного лока для комнаты."""
        if room_code not in self.room_locks:
            self.room_locks[room_code] = asyncio.Lock()
        return self.room_locks[room_code]

    async def init_redis(self, redis_url: Optional[str] = None):
        """Инициализация подключения к Redis с проверкой доступности."""
        url = redis_url or settings.REDIS_URL
        try:
            client = aioredis.from_url(
                url,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=2.0,
            )
            await client.ping()
            self.redis_client = client
            self.redis_available = True
            logger.info("RoomStateEngine: Успешное подключение к Redis L2 кэшу.")
        except Exception as e:
            self.redis_available = False
            logger.warning(f"RoomStateEngine: Redis недоступен ({e}). Работа в L1 In-Memory режиме.")

    async def close(self):
        """Закрытие соединений с Redis."""
        if self.redis_client:
            try:
                await self.redis_client.aclose()
            except Exception:
                pass
            self.redis_available = False

    # ==========================================
    # Redis Синхронизация (L2 Cache)
    # ==========================================

    async def _sync_room_to_redis(self, room: GameRoom):
        """Асинхронное сохранение снапшота комнаты в Redis (TTL 4 часа)."""
        if not self.redis_available or not self.redis_client:
            return
        try:
            key = f"room:{room.room_code}:state"
            payload = room.model_dump_json()
            await self.redis_client.set(key, payload, ex=14400)

            # Сохранение лидерборда в Redis Sorted Set
            zset_key = f"room:{room.room_code}:leaderboard"
            mapping = {p.id: float(p.score) for p in room.players.values()}
            if mapping:
                await self.redis_client.zadd(zset_key, mapping)
                await self.redis_client.expire(zset_key, 14400)
        except Exception as e:
            logger.warning(f"Ошибка синхронизации комнаты {room.room_code} в Redis: {e}")

    async def _sync_session_to_redis(self, session: SessionData):
        """Сохранение сессионного токена в Redis (TTL 12 часов)."""
        if not self.redis_available or not self.redis_client:
            return
        try:
            key = f"session:{session.session_token}"
            payload = session.model_dump_json()
            await self.redis_client.set(key, payload, ex=43200)
        except Exception as e:
            logger.warning(f"Ошибка сохранения сессии {session.session_token} в Redis: {e}")

    async def _restore_room_from_redis(self, room_code: str) -> Optional[GameRoom]:
        """Восстановление комнаты из Redis при отсутствии в оперативной памяти."""
        if not self.redis_available or not self.redis_client:
            return None
        try:
            key = f"room:{room_code}:state"
            raw = await self.redis_client.get(key)
            if raw:
                data = json.loads(raw)
                room = GameRoom.model_validate(data)
                self.rooms[room_code] = room
                return room
        except Exception as e:
            logger.warning(f"Ошибка восстановления комнаты {room_code} из Redis: {e}")
        return None

    async def _restore_session_from_redis(self, token: str) -> Optional[SessionData]:
        """Восстановление сессии из Redis."""
        if not self.redis_available or not self.redis_client:
            return None
        try:
            key = f"session:{token}"
            raw = await self.redis_client.get(key)
            if raw:
                data = json.loads(raw)
                session = SessionData.model_validate(data)
                self.sessions[token] = session
                return session
        except Exception as e:
            logger.warning(f"Ошибка восстановления сессии из Redis: {e}")
        return None

    # ==========================================
    # Генератор PIN-кодов и Сессии
    # ==========================================

    async def generate_room_code(self) -> str:
        """
        Генерация уникального 6-значного цифрового PIN-кода комнаты (100000..999999)
        с гарантией отсутствия коллизий в L1 и L2 кэше.
        """
        for _ in range(100):
            code = str(secrets.randbelow(900000) + 100000)
            if code in self.rooms:
                continue
            if self.redis_available and self.redis_client:
                exists = await self.redis_client.exists(f"room:{code}:state")
                if exists:
                    continue
            return code
        raise RuntimeError("Не удалось сгенерировать уникальный PIN-код комнаты")

    async def create_session(
        self,
        room_code: str,
        player_id: str,
        role: UserRole,
        name: str,
        avatar: str = "fox_1",
        pseudonym_id: str = "",
    ) -> str:
        """Создание криптографически стойкого сессионного токена."""
        token = secrets.token_urlsafe(32)
        session = SessionData(
            session_token=token,
            room_code=room_code,
            player_id=player_id,
            role=role,
            name=name,
            avatar=avatar,
            pseudonym_id=pseudonym_id,
        )
        self.sessions[token] = session
        await self._sync_session_to_redis(session)
        return token

    async def get_session(self, token: str) -> Optional[SessionData]:
        """Получение данных сессии (L1 -> L2)."""
        if token in self.sessions:
            return self.sessions[token]
        return await self._restore_session_from_redis(token)

    async def remove_session(self, token: str):
        """Удаление сессии при выходе."""
        self.sessions.pop(token, None)
        if self.redis_available and self.redis_client:
            try:
                await self.redis_client.delete(f"session:{token}")
            except Exception:
                pass

    # ==========================================
    # Конечный автомат (FSM)
    # ==========================================

    async def transition_state(self, room_code: str, new_status: RoomStatus) -> RoomStatus:
        """
        Валидация и переход состояния комнаты в новый статус.
        Выбрасывает InvalidStateTransitionError при недопустимом переходе.
        """
        room = await self.get_room(room_code)
        if not room:
            raise ValueError(f"Комната {room_code} не найдена")

        if room.status == new_status:
            return room.status

        allowed = VALID_TRANSITIONS.get(room.status, [])
        if new_status not in allowed:
            raise InvalidStateTransitionError(
                f"Недопустимый переход статуса комнаты: {room.status.value} -> {new_status.value}. "
                f"Разрешены: {[s.value for s in allowed]}"
            )

        room.status = new_status
        await self._sync_room_to_redis(room)
        logger.info(f"Комната {room_code} сменила статус: {room.status.value}")
        return room.status

    # ==========================================
    # Управление жизненным циклом комнат
    # ==========================================

    async def create_room(
        self,
        quiz: Quiz,
        teacher_name: str = "Учитель",
        teacher_pseudonym_id: str = "teacher_host",
    ) -> Tuple[GameRoom, str]:
        """
        Создание новой игровой комнаты учителем.
        Возвращает кортеж (GameRoom, teacher_session_token).
        """
        room_code = await self.generate_room_code()
        teacher_token = await self.create_session(
            room_code=room_code,
            player_id="teacher",
            role=UserRole.TEACHER,
            name=teacher_name,
            pseudonym_id=teacher_pseudonym_id,
        )

        room = GameRoom(
            room_code=room_code,
            quiz=quiz,
            status=RoomStatus.LOBBY,
            current_question_index=0,
            time_remaining=20,
            grove_energy=0,
            teacher_pseudonym_id=teacher_pseudonym_id,
            players={},
            answered_player_ids=[],
        )
        self.rooms[room_code] = room
        self.answers[room_code] = []
        await self._sync_room_to_redis(room)
        return room, teacher_token

    async def get_room(self, room_code: str) -> Optional[GameRoom]:
        """Получение комнаты по 6-значному PIN-коду (L1 -> L2 fallback)."""
        if room_code in self.rooms:
            return self.rooms[room_code]
        return await self._restore_room_from_redis(room_code)

    async def join_room(
        self,
        room_code: str,
        name: str,
        avatar: Optional[str] = None,
        pseudonym_id: Optional[str] = None,
    ) -> Tuple[Player, str]:
        """
        Подключение ученика к комнате в лобби.
        Возвращает кортеж (Player, session_token).
        """
        async with self.get_room_lock(room_code):
            room = await self.get_room(room_code)
            if not room:
                raise ValueError("Комната не найдена")

            if room.status != RoomStatus.LOBBY:
                raise InvalidStateTransitionError("Вход невозможен: игра уже началась или завершена")

            if len(room.players) >= 50:
                raise ValueError("Комната переполнена (максимум 50 участников)")

            # Очистка предыдущих неактивных/дублирующихся сессий с тем же именем в лобби
            ghost_ids = [
                pid for pid, p in room.players.items()
                if p.name.strip().lower() == name.strip().lower() and not p.connected
            ]
            for gid in ghost_ids:
                room.players.pop(gid, None)

            player_id = f"p_{secrets.token_hex(4)}"
            avatars_pool = ["fox_1", "fox_smart", "fox_happy", "fox_detective", "hedgehog", "raccoon", "owl", "bear"]
            selected_avatar = avatar if avatar in avatars_pool else secrets.choice(avatars_pool)
            p_id = pseudonym_id or f"anon_{secrets.token_hex(8)}"

            player = Player(
                id=player_id,
                name=name.strip() or "Ученик",
                avatar=selected_avatar,
                score=0,
                streak=0,
                connected=True,
                blurred_count=0,
                pseudonym_id=p_id,
            )
            room.players[player_id] = player

            token = await self.create_session(
                room_code=room_code,
                player_id=player_id,
                role=UserRole.STUDENT,
                name=player.name,
                avatar=player.avatar,
                pseudonym_id=p_id,
            )

            await self._sync_room_to_redis(room)
            return player, token

    async def set_player_connection(self, session_token: str, connected: bool):
        """Обновление статуса онлайн-подключения игрока."""
        session = await self.get_session(session_token)
        if not session or session.role != UserRole.STUDENT:
            return
        room = await self.get_room(session.room_code)
        if room and session.player_id in room.players:
            if not connected and room.status == RoomStatus.LOBBY:
                # В лобби вышедший ученик сразу удаляется из комнаты, чтобы не висеть призраком
                room.players.pop(session.player_id, None)
            else:
                room.players[session.player_id].connected = connected
            await self._sync_room_to_redis(room)

    async def update_room_quiz(self, room_code: str, quiz: Quiz) -> GameRoom:
        """Обновление или замена викторины в комнате (разрешено только в статусе LOBBY)."""
        async with self.get_room_lock(room_code):
            room = await self.get_room(room_code)
            if not room:
                raise ValueError("Комната не найдена")
            if room.status != RoomStatus.LOBBY:
                raise InvalidStateTransitionError("Нельзя изменять викторину после начала игры")
            room.quiz = quiz
            await self._sync_room_to_redis(room)
            return room

    # ==========================================
    # Игровой процесс, Скоринг и Анти-чит
    # ==========================================

    async def start_game(self, room_code: str) -> RoomStatus:
        """Учитель запускает игру (переход LOBBY -> COUNTDOWN)."""
        async with self.get_room_lock(room_code):
            return await self.transition_state(room_code, RoomStatus.COUNTDOWN)

    async def start_question(self, room_code: str, question_index: int) -> RoomStatus:
        """Начало вопроса: сброс таймера, калибровка тира и списка ответивших."""
        async with self.get_room_lock(room_code):
            room = await self.get_room(room_code)
            if not room:
                raise ValueError("Комната не найдена")

            room.current_question_index = question_index
            room.answered_player_ids = []
            room.question_start_epoch_ms = int(time.time() * 1000)
            cur_q = room.quiz.questions[question_index]

            # Определение параметров сложности (тиры 1, 2, 3)
            # Tier 1: 15 сек, 500 очков
            # Tier 2: 25 сек, 750 очков
            # Tier 3: 40 сек, 1000 очков, is_boss: true
            tier = getattr(cur_q, "tier", None)
            is_boss = bool(getattr(cur_q, "is_boss", False))

            if tier == 3 or is_boss or cur_q.difficulty == "hard":
                tier = 3
                is_boss = True
                cur_q.time_limit_sec = cur_q.time_limit_sec or 40
            elif tier == 1 or (cur_q.time_limit_sec and cur_q.time_limit_sec <= 20) or cur_q.difficulty == "easy":
                tier = 1
                is_boss = False
                cur_q.time_limit_sec = cur_q.time_limit_sec or 15
            else:
                tier = 2
                is_boss = False
                cur_q.time_limit_sec = cur_q.time_limit_sec or 25

            cur_q.tier = tier
            cur_q.is_boss = is_boss
            room.time_remaining = cur_q.time_limit_sec

            return await self.transition_state(room_code, RoomStatus.QUESTION)

    def calculate_score(
        self,
        question: Question,
        time_taken_sec: float,
        is_correct: bool,
        current_streak: int,
        tab_blurred: bool,
    ) -> Tuple[int, int, int]:
        """
        Двухфазный расчет очков по спецификации RESEARCH.md:
        - t_read = N_words * 0.3 сек (когнитивный порог чтения).
        - Если t < t_read -> ответ наугад, скоростной бонус = 0.
        - Иначе S_speed = 500 * (1 - (t - t_read) / (T_max - t_read))^1.5.
        - Бонус за стрик: min(streak * 50, 250).
        - Анти-чит: при расфокусе окна скоростной бонус обнуляется.
        Возвращает кортеж: (points_awarded, new_streak, speed_bonus).
        """
        if not is_correct:
            return 0, 0, 0

        new_streak = current_streak + 1
        tier = getattr(question, "tier", 1) or 1
        base_score = 500 if tier == 1 else (750 if tier == 2 else 1000)
        streak_bonus = min(new_streak * 50, 250)

        # Подсчет слов для порога чтения t_read
        words_count = len(question.text.split())
        t_read = min(words_count * 0.3, float(question.time_limit_sec) * 0.5)
        t_max = float(question.time_limit_sec)

        speed_bonus = 0
        if not tab_blurred and (time_taken_sec >= t_read) and (time_taken_sec <= t_max):
            ratio = (time_taken_sec - t_read) / max(0.1, (t_max - t_read))
            speed_bonus = int(500 * math.pow(max(0.0, 1.0 - ratio), 1.5))
        elif time_taken_sec < t_read:
            # Слишком быстрый клик (угадывание без чтения вопроса)
            speed_bonus = 0

        total_points = base_score + speed_bonus + streak_bonus
        return total_points, new_streak, speed_bonus

    async def record_answer(self, sub: AnswerSubmission) -> Dict:
        """
        Фиксация ответа ученика с защитой от повторного ответа
        и инкрементом командной энергии «Рощи класса».
        """
        async with self.get_room_lock(sub.room_code):
            room = await self.get_room(sub.room_code)
            if not room:
                return {"status": "error", "code": "ROOM_NOT_FOUND", "message": "Комната не найдена"}

            if room.status != RoomStatus.QUESTION:
                return {"status": "error", "code": "QUESTION_NOT_ACTIVE", "message": "Вопрос сейчас не активен"}

            player = room.players.get(sub.player_id)
            if not player:
                return {"status": "error", "code": "PLAYER_NOT_FOUND", "message": "Игрок не найден"}

            # Защита от повторного ответа
            if sub.player_id in room.answered_player_ids:
                return {"status": "error", "code": "ALREADY_ANSWERED", "message": "Ответ уже отправлен"}

            room.answered_player_ids.append(sub.player_id)
            if sub.room_code not in self.answers:
                self.answers[sub.room_code] = []
            self.answers[sub.room_code].append(sub)

            if sub.tab_blurred:
                player.blurred_count += 1

            # Проверка правильности
            cur_q = room.quiz.questions[room.current_question_index]
            correct_opt = next((o for o in cur_q.options if o.is_correct), None)
            is_correct = bool(correct_opt and (correct_opt.id == sub.option_id))

            tier = getattr(cur_q, "tier", 2) or 2
            time_limit = getattr(cur_q, "time_limit_sec", 25)

            # Оценка когнитивного порога чтения (тихий античит van der Linden)
            options_dict = [o.model_dump() for o in cur_q.options]
            time_floor = adaptive_engine.calculate_time_floor(cur_q.text, options_dict)
            is_rapid, effort_weight = adaptive_engine.evaluate_response_effort(sub.time_taken_sec, time_floor)

            # Двухфазная модель скоринга (День 4 ТЗ): база + скорость + стрик
            points, new_streak, speed_bonus = self.calculate_score(
                question=cur_q,
                time_taken_sec=sub.time_taken_sec,
                is_correct=is_correct,
                current_streak=player.streak,
                tab_blurred=sub.tab_blurred,
            )

            player.score += points
            player.streak = new_streak

            # Обогащение телеметрии ответа для итогового отчёта
            sub.is_correct = is_correct
            sub.is_rapid = is_rapid
            sub.points_awarded = points
            sub.tier = tier

            # Энергия «Рощи класса» (Class Grove)
            if is_correct:
                total_q = len(room.quiz.questions)
                total_p = max(1, len(room.players))
                step = max(1, int(100 / (total_q * total_p)))
                room.grove_energy = min(100, room.grove_energy + step)

            # Проверка, ответили ли все активные игроки
            active_players = [p for p in room.players.values() if p.connected]
            all_answered = len(room.answered_player_ids) >= len(active_players)

            await self._sync_room_to_redis(room)

            return {
                "status": "success",
                "is_correct": is_correct,
                "points_awarded": points,
                "speed_bonus": speed_bonus,
                "total_score": player.score,
                "streak": player.streak,
                "all_answered": all_answered,
                "grove_energy": room.grove_energy,
                "blurred_count": player.blurred_count,
            }

    async def reveal_results(self, room_code: str) -> Dict:
        """Показ результатов вопроса (переход QUESTION -> REVEAL_RESULTS)."""
        async with self.get_room_lock(room_code):
            await self.transition_state(room_code, RoomStatus.REVEAL_RESULTS)
            room = await self.get_room(room_code)
            cur_q = room.quiz.questions[room.current_question_index]

            # Подсчет распределения ответов
            room_answers = self.answers.get(room_code, [])
            current_q_answers = [a for a in room_answers if a.question_id == cur_q.id]
            distribution = {str(opt.id): 0 for opt in cur_q.options}
            for a in current_q_answers:
                k = str(a.option_id)
                if k in distribution:
                    distribution[k] += 1

            correct_opt = next((o for o in cur_q.options if o.is_correct), None)

            return {
                "question_id": cur_q.id,
                "correct_option_id": correct_opt.id if correct_opt else 0,
                "explanation": cur_q.explanation or "",
                "distribution": distribution,
                "grove_energy": room.grove_energy,
            }

    async def show_leaderboard(self, room_code: str, top_n: int = 5) -> Dict:
        """Показ лидерборда (переход REVEAL_RESULTS -> LEADERBOARD)."""
        async with self.get_room_lock(room_code):
            await self.transition_state(room_code, RoomStatus.LEADERBOARD)
            room = await self.get_room(room_code)

            sorted_players = sorted(room.players.values(), key=lambda p: p.score, reverse=True)
            top_players = [
                {
                    "rank": idx + 1,
                    "id": p.id,
                    "name": p.name,
                    "avatar": p.avatar,
                    "score": p.score,
                    "streak": p.streak,
                }
                for idx, p in enumerate(sorted_players[:top_n])
            ]

            is_last = (room.current_question_index + 1) >= len(room.quiz.questions)
            return {
                "top_players": top_players,
                "grove_energy": room.grove_energy,
                "is_last_question": is_last,
            }

    async def next_question(self, room_code: str) -> Dict:
        """
        Переход к следующему вопросу (LEADERBOARD -> COUNTDOWN)
        или завершение игры (LEADERBOARD -> FINISHED).
        """
        async with self.get_room_lock(room_code):
            room = await self.get_room(room_code)
            if not room:
                raise ValueError("Комната не найдена")

            if (room.current_question_index + 1) < len(room.quiz.questions):
                room.current_question_index += 1
                room.answered_player_ids = []
                room.question_start_epoch_ms = None
                await self.transition_state(room_code, RoomStatus.COUNTDOWN)
                return {
                    "has_next": True,
                    "question_index": room.current_question_index,
                    "status": room.status.value,
                }
            else:
                await self.transition_state(room_code, RoomStatus.FINISHED)
                # Связка с Классной Рощей 2.0 (Ivan's Class Grove & Liebig Balance)
                try:
                    from .grove_service import grove_service
                    class_id = f"class_{room.quiz.grade}a"
                    room_answers = self.answers.get(room_code, [])
                    student_results = []
                    for p in room.players.values():
                        p_answers = [a for a in room_answers if a.player_id == p.id]
                        t1_corr = sum(1 for a in p_answers if getattr(a, "is_correct", False) and getattr(a, "tier", 1) == 1)
                        t2_corr = sum(1 for a in p_answers if getattr(a, "is_correct", False) and getattr(a, "tier", 1) == 2)
                        t3_corr = sum(1 for a in p_answers if getattr(a, "is_correct", False) and getattr(a, "tier", 1) == 3)
                        student_results.append({
                            "student_id": p.id,
                            "student_name": p.name,
                            "avatar": p.avatar or "hedgehog",
                            "points_earned": p.score,
                            "tier1_correct": t1_corr,
                            "tier2_correct": t2_corr,
                            "tier3_correct": t3_corr,
                            "total_questions": len(room.quiz.questions),
                        })
                    if student_results:
                        grove_service.apply_quiz_session(class_id=class_id, student_results=student_results)
                except Exception as ge:
                    logger.warning("Grove service integration error on FINISHED: %s", ge)

                return {
                    "has_next": False,
                    "status": room.status.value,
                }

    # ==========================================
    # Восстановление состояния (SYNC_STATE)
    # ==========================================

    async def get_sync_state(self, room_code: str, player_id: Optional[str] = None) -> Optional[SyncState]:
        """
        Формирование пакета аварийного восстановления SYNC_STATE
        при обрыве связи или повторном открытии вкладки.
        """
        room = await self.get_room(room_code)
        if not room:
            return None

        # Расчет оставшихся миллисекунд
        remaining_ms = 0
        if room.status == RoomStatus.QUESTION and room.question_start_epoch_ms:
            cur_q = room.quiz.questions[room.current_question_index]
            elapsed_ms = int(time.time() * 1000) - room.question_start_epoch_ms
            total_limit_ms = cur_q.time_limit_sec * 1000
            remaining_ms = max(0, total_limit_ms - elapsed_ms)

        player = room.players.get(player_id) if player_id else None
        has_answered = bool(player_id and (player_id in room.answered_player_ids))

        # Текущий вопрос (скрываем правильный ответ от ученика во время вопроса)
        cur_q_copy = None
        if room.status in [RoomStatus.QUESTION, RoomStatus.REVEAL_RESULTS]:
            q_src = room.quiz.questions[room.current_question_index]
            cur_q_copy = q_src.model_copy(deep=True)
            if room.status == RoomStatus.QUESTION:
                for opt in cur_q_copy.options:
                    opt.is_correct = False  # Скрываем до раунда ответов

        player_list = [
            {
                "id": p.id,
                "name": p.name,
                "avatar": p.avatar,
                "score": p.score,
                "streak": p.streak,
                "connected": p.connected,
            }
            for p in room.players.values()
        ]

        return SyncState(
            room_code=room.room_code,
            status=room.status,
            current_question_index=room.current_question_index,
            total_questions=len(room.quiz.questions),
            remaining_time_ms=remaining_ms,
            has_answered=has_answered,
            grove_energy=room.grove_energy,
            player_score=player.score if player else 0,
            player_streak=player.streak if player else 0,
            blurred_count=player.blurred_count if player else 0,
            current_question=cur_q_copy,
            players=player_list,
        )

    # ==========================================
    # Генерация Gap Report
    # ==========================================

    async def generate_gap_report(self, room_code: str) -> Optional[GapReport]:
        """Генерация итоговой аналитической матрицы дефицитов класса."""
        room = await self.get_room(room_code)
        if not room:
            return None

        total_players = len(room.players)
        avg_score = (sum(p.score for p in room.players.values()) / total_players) if total_players > 0 else 0.0

        room_subs = self.answers.get(room_code, [])
        stats: List[QuestionStat] = []
        weak_topics = []

        total_correct_all = 0
        total_answers_all = max(1, len(room_subs))

        for q in room.quiz.questions:
            q_subs = [s for s in room_subs if s.question_id == q.id]
            correct_opt = next((o for o in q.options if o.is_correct), None)
            correct_count = 0
            opt_counts: Dict[int, int] = {opt.id: 0 for opt in q.options}

            for s in q_subs:
                opt_counts[s.option_id] = opt_counts.get(s.option_id, 0) + 1
                if correct_opt and s.option_id == correct_opt.id:
                    correct_count += 1
                    total_correct_all += 1

            total_q_ans = len(q_subs)
            pct = int((correct_count / total_q_ans * 100)) if total_q_ans > 0 else 100
            mistakes = total_q_ans - correct_count

            # Определение преобладающего дистрактора
            dominant_distractor = None
            if correct_opt:
                wrong_counts = {k: v for k, v in opt_counts.items() if k != correct_opt.id and v > 0}
                if wrong_counts:
                    worst_id = max(wrong_counts, key=wrong_counts.get)
                    worst_opt = next((o for o in q.options if o.id == worst_id), None)
                    if worst_opt:
                        dominant_distractor = worst_opt.text

            topic_title = q.topic or room.quiz.topic
            if pct < 60 and topic_title not in weak_topics:
                weak_topics.append(f"{topic_title} (вопрос #{q.id})")

            stats.append(
                QuestionStat(
                    question_id=q.id,
                    text=q.text,
                    correct_percent=pct,
                    topic=topic_title,
                    mistake_count=mistakes,
                    dominant_distractor=dominant_distractor,
                    cognitive_gap=q.explanation if pct < 70 else None,
                )
            )

        class_acc = int((total_correct_all / total_answers_all) * 100) if len(room_subs) > 0 else 100
        flagged = [p.name for p in room.players.values() if p.blurred_count > 1]

        # Формирование телеметрии ответов для ML 2.0 движка ремедиации и античита
        session_responses = []
        for s in room_subs:
            pl = room.players.get(s.player_id)
            cur_q_match = next((q for q in room.quiz.questions if q.id == s.question_id), None)
            canonical = (cur_q_match.canonical_id or f"item_{cur_q_match.id}") if cur_q_match else f"item_{s.question_id}"
            
            opt_idx = 0
            if cur_q_match:
                for idx, opt in enumerate(cur_q_match.options):
                    if opt.id == s.option_id:
                        opt_idx = idx
                        break

            session_responses.append({
                "student_id": s.player_id,
                "student_name": pl.name if pl else "Ученик",
                "student_pseudo_id": (pl.pseudonym_id if pl else s.player_id),
                "item_id": str(canonical),
                "opt_idx": opt_idx,
                "is_correct": bool(s.is_correct),
                "response_time_sec": s.time_taken_sec,
                "tab_blurred": bool(s.tab_blurred),
                "blur_count": pl.blurred_count if pl else 0,
                "rapid_flag": bool(s.is_rapid),
                "rapid_guess_count": 1 if s.is_rapid else 0
            })

        ml2_report = remediation_engine.generate_class_gap_report(room_code, session_responses)

        hw_recommendation = (
            f"Скорректировать домашнее задание по темам: {', '.join(weak_topics)}"
            if weak_topics
            else "Тема отлично усвоена классом, закрепить стандартным упражнением."
        )

        topics = weak_topics or ml2_report.get("teacher_action_recommendations", []) or [f"Повторение: {room.quiz.topic}"]

        return GapReport(
            room_code=room_code,
            quiz_title=room.quiz.title,
            total_participants=total_players,
            average_score=round(avg_score, 1),
            class_accuracy_percent=class_acc,
            grove_growth_percent=room.grove_energy,
            questions_stats=stats,
            topics_to_review=topics,
            homework_recommendation=hw_recommendation,
            flagged_cheaters=flagged,
            top_misconceptions=ml2_report.get("top_misconceptions", []),
            cheating_audit_log=ml2_report.get("cheating_audit_log", []),
            skills_breakdown=ml2_report.get("skills_breakdown", []),
            root_cause_attribution=ml2_report.get("root_cause_attribution", {}),
        )


room_state_engine = RoomStateEngine()
