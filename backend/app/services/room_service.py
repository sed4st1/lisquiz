import random
import uuid
from typing import Dict, Optional, List
from ..models.schemas import (
    GameRoom,
    Quiz,
    Player,
    AnswerSubmission,
    GapReport,
    QuestionStat,
)

class RoomService:
    def __init__(self):
        # In-memory хранилище активных комнат
        self.rooms: Dict[str, GameRoom] = {}
        # Хранилище ответов: room_code -> List[AnswerSubmission]
        self.answers: Dict[str, List[AnswerSubmission]] = {}

    def create_room(self, quiz: Quiz) -> GameRoom:
        # Генерация 6-значного PIN-кода комнаты как на макетах (например 482915)
        room_code = str(random.randint(100000, 999999))
        while room_code in self.rooms:
            room_code = str(random.randint(100000, 999999))

        room = GameRoom(
            room_code=room_code,
            quiz=quiz,
            status="lobby",
            current_question_index=0,
            time_remaining=20,
            players={}
        )
        self.rooms[room_code] = room
        self.answers[room_code] = []
        return room

    def get_room(self, room_code: str) -> Optional[GameRoom]:
        return self.rooms.get(room_code)

    def join_room(self, room_code: str, name: str, avatar: Optional[str] = None) -> Optional[Player]:
        room = self.get_room(room_code)
        if not room:
            return None

        player_id = f"p_{uuid.uuid4().hex[:6]}"
        avatars_pool = ["fox_1", "fox_smart", "fox_happy", "fox_detective", "hedgehog", "raccoon", "owl", "bear"]
        selected_avatar = avatar or random.choice(avatars_pool)

        player = Player(
            id=player_id,
            name=name.strip() or "Ученик",
            avatar=selected_avatar,
            score=0,
            streak=0,
            connected=True
        )
        room.players[player_id] = player
        return player

    def record_answer(self, sub: AnswerSubmission) -> Dict:
        room = self.get_room(sub.room_code)
        if not room or room.status != "playing":
            return {"status": "error", "message": "Комната не активна"}

        player = room.players.get(sub.player_id)
        if not player:
            return {"status": "error", "message": "Игрок не найден"}

        if sub.tab_blurred:
            player.blurred_count += 1

        self.answers[sub.room_code].append(sub)

        # Проверка правильности
        cur_q = room.quiz.questions[room.current_question_index]
        correct_opt = next((o for o in cur_q.options if o.is_correct), None)
        is_correct = correct_opt and (correct_opt.id == sub.option_id)

        # Расчет очков (быстрота + серия)
        points = 0
        if is_correct:
            player.streak += 1
            # Базовые очки 500 + бонус за скорость (до 500) + бонус за стрик
            speed_bonus = max(0, int((cur_q.time_limit_sec - sub.time_taken_sec) / cur_q.time_limit_sec * 500))
            streak_bonus = min(player.streak * 50, 250)
            points = 500 + speed_bonus + streak_bonus
            player.score += points
        else:
            player.streak = 0

        return {
            "status": "success",
            "is_correct": is_correct,
            "points": points,
            "total_score": player.score,
            "streak": player.streak,
            "blurred_count": player.blurred_count
        }

    def start_game(self, room_code: str) -> bool:
        room = self.get_room(room_code)
        if not room:
            return False
        room.status = "playing"
        room.current_question_index = 0
        return True

    def next_question(self, room_code: str) -> Optional[int]:
        room = self.get_room(room_code)
        if not room:
            return None

        if room.current_question_index + 1 < len(room.quiz.questions):
            room.current_question_index += 1
            room.status = "playing"
            return room.current_question_index
        else:
            room.status = "finished"
            return -1

    def generate_gap_report(self, room_code: str) -> Optional[GapReport]:
        room = self.get_room(room_code)
        if not room:
            return None

        total_players = len(room.players)
        avg_score = (sum(p.score for p in room.players.values()) / total_players) if total_players > 0 else 0.0

        # Статистика по каждому вопросу
        room_subs = self.answers.get(room_code, [])
        stats: List[QuestionStat] = []
        weak_topics = []

        for q in room.quiz.questions:
            q_subs = [s for s in room_subs if s.question_id == q.id]
            correct_opt = next((o for o in q.options if o.is_correct), None)
            correct_count = 0
            if correct_opt:
                correct_count = sum(1 for s in q_subs if s.option_id == correct_opt.id)

            total_answers = len(q_subs)
            pct = int((correct_count / total_answers * 100)) if total_answers > 0 else 100
            mistakes = total_answers - correct_count

            topic_title = q.topic or room.quiz.topic
            if pct < 60 and topic_title not in weak_topics:
                weak_topics.append(f"{topic_title} (вопрос #{q.id})")

            stats.append(
                QuestionStat(
                    question_id=q.id,
                    text=q.text,
                    correct_percent=pct,
                    topic=topic_title,
                    mistake_count=mistakes
                )
            )

        # Выявление подозрительных (сворачивание окна)
        flagged = [p.name for p in room.players.values() if p.blurred_count > 1]

        return GapReport(
            room_code=room_code,
            quiz_title=room.quiz.title,
            total_participants=total_players,
            average_score=round(avg_score, 1),
            questions_stats=stats,
            topics_to_review=weak_topics or [f"Повторение: {room.quiz.topic}"],
            flagged_cheaters=flagged
        )

room_service = RoomService()
