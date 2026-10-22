import time
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from ..models.schemas import UserRole, RoomStatus, AnswerSubmission
from ..services.room_state_engine import room_state_engine
from ..services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws/rooms/{room_code}")
async def websocket_room_endpoint(
    websocket: WebSocket,
    room_code: str,
    token: str = Query(..., description="Сессионный токен игрока или учителя"),
):
    """
    Основной WebSocket эндпоинт реального времени для живой игры в классе.
    - Проверка подлинности сессионного токена.
    - Мгновенная отправка снапшота SYNC_STATE.
    - Обработка событий лобби, тиков таймера, ответов и античита.
    """
    # 1. Валидация сессии
    session = await room_state_engine.get_session(token)
    if not session or session.room_code != room_code:
        logger.warning(f"Отказ WS подключения: недействительный токен {token} для комнаты {room_code}")
        await websocket.close(code=4001, reason="Недействительный или истекший сессионный токен")
        return

    room = await room_state_engine.get_room(room_code)
    if not room:
        logger.warning(f"Отказ WS подключения: комната {room_code} не найдена")
        await websocket.close(code=4004, reason="Комната не найдена")
        return

    # 2. Принятие соединения и регистрация в ConnectionManager
    await ws_manager.connect(websocket, session)
    if session.role == UserRole.STUDENT:
        await room_state_engine.set_player_connection(token, True)

    # 3. Немедленная отправка SYNC_STATE подключающемуся клиенту
    sync_state = await room_state_engine.get_sync_state(room_code, player_id=session.player_id)
    if sync_state:
        await ws_manager.send_personal(websocket, "SYNC_STATE", sync_state.model_dump())

    # 4. Оповещение комнаты о новом подключении
    if session.role == UserRole.STUDENT:
        # Всем остальным в комнате
        await ws_manager.broadcast_room(
            room_code,
            "PLAYER_JOINED",
            {
                "player_id": session.player_id,
                "name": session.name,
                "avatar": session.avatar,
                "total_players": len(room.players),
            },
            exclude=websocket,
        )
    else:
        # Ученикам в комнате
        await ws_manager.broadcast_students(
            room_code,
            "TEACHER_CONNECTED",
            {"teacher_name": session.name, "status": room.status.value},
        )

    # 5. Цикл обработки входящих сообщений от клиента
    try:
        while True:
            msg = await websocket.receive_json()
            event = msg.get("event")
            data = msg.get("data", {})

            if not event:
                continue

            # Heartbeat (Ping -> Pong)
            if event == "PING":
                await ws_manager.send_personal(websocket, "PONG", {"timestamp": int(time.time() * 1000)})
                continue

            # ==========================================
            # Команды Учителя (Хоста)
            # ==========================================
            if session.role == UserRole.TEACHER:
                if event == "KICK_PLAYER":
                    target_id = data.get("player_id")
                    if target_id and target_id in room.players:
                        kicked_name = room.players[target_id].name
                        room.players.pop(target_id, None)
                        await ws_manager.kick_player(room_code, target_id, reason="Исключён учителем")
                        await ws_manager.broadcast_room(
                            room_code,
                            "PLAYER_LEFT",
                            {
                                "player_id": target_id,
                                "name": kicked_name,
                                "reason": "kicked",
                                "total_players": len(room.players),
                            },
                        )

                elif event == "TEACHER_ACTION":
                    action = data.get("action")
                    if action == "START_GAME":
                        await room_state_engine.start_game(room_code)
                        await ws_manager.broadcast_room(
                            room_code,
                            "COUNTDOWN_START",
                            {"countdown_sec": 3, "total_questions": len(room.quiz.questions)},
                        )

                    elif action == "START_QUESTION":
                        q_idx = int(data.get("question_index", room.current_question_index))
                        await room_state_engine.start_question(room_code, q_idx)
                        cur_q = room.quiz.questions[q_idx]

                        tier = getattr(cur_q, "tier", 2) or 2
                        is_boss = bool(getattr(cur_q, "is_boss", False))
                        time_limit_sec = cur_q.time_limit_sec

                        # Для учителя отправляем полные данные (включая правильный ответ)
                        q_teacher = cur_q.model_dump()
                        q_teacher["tier"] = tier
                        q_teacher["is_boss"] = is_boss
                        q_teacher["time_limit_sec"] = time_limit_sec

                        # Для учеников скрываем правильный ответ от инспектора сети
                        q_student = cur_q.model_dump()
                        q_student["tier"] = tier
                        q_student["is_boss"] = is_boss
                        q_student["time_limit_sec"] = time_limit_sec
                        for opt in q_student["options"]:
                            opt["is_correct"] = False

                        await ws_manager.broadcast_teacher(
                            room_code,
                            "QUESTION_START",
                            {
                                "question_index": q_idx,
                                "total_questions": len(room.quiz.questions),
                                "question": q_teacher,
                                "tier": tier,
                                "is_boss": is_boss,
                                "time_limit_sec": time_limit_sec,
                            },
                        )
                        await ws_manager.broadcast_students(
                            room_code,
                            "QUESTION_START",
                            {
                                "question_index": q_idx,
                                "total_questions": len(room.quiz.questions),
                                "question": q_student,
                                "tier": tier,
                                "is_boss": is_boss,
                                "time_limit_sec": time_limit_sec,
                            },
                        )

                    elif action == "SHOW_RESULTS":
                        results = await room_state_engine.reveal_results(room_code)
                        await ws_manager.broadcast_room(room_code, "QUESTION_RESULTS", results)

                    elif action == "SHOW_LEADERBOARD":
                        lb = await room_state_engine.show_leaderboard(room_code)
                        await ws_manager.broadcast_room(room_code, "LEADERBOARD_UPDATE", lb)

                    elif action == "NEXT_QUESTION":
                        nxt = await room_state_engine.next_question(room_code)
                        if nxt["has_next"]:
                            await ws_manager.broadcast_room(
                                room_code,
                                "COUNTDOWN_START",
                                {
                                    "countdown_sec": 3,
                                    "question_index": nxt["question_index"],
                                    "total_questions": len(room.quiz.questions),
                                },
                            )
                        else:
                            gap_rep = await room_state_engine.generate_gap_report(room_code)
                            await ws_manager.broadcast_room(
                                room_code,
                                "GAME_FINISHED",
                                {"gap_report": gap_rep.model_dump() if gap_rep else {}},
                            )

            # ==========================================
            # Действия Ученика
            # ==========================================
            elif session.role == UserRole.STUDENT:
                if event == "SUBMIT_ANSWER":
                    sub = AnswerSubmission(
                        room_code=room_code,
                        player_id=session.player_id,
                        question_id=int(data.get("question_id", 0)),
                        option_id=int(data.get("option_id", 0)),
                        time_taken_sec=float(data.get("time_taken_sec", 0.0)),
                        tab_blurred=bool(data.get("tab_blurred", False)),
                    )
                    res = await room_state_engine.record_answer(sub)

                    # Персональный результат ученику
                    await ws_manager.send_personal(websocket, "PERSONAL_ANSWER_RESULT", res)

                    # Оповещение учителя об инкременте ответов
                    await ws_manager.broadcast_teacher(
                        room_code,
                        "ANSWER_COLLECTED",
                        {
                            "player_id": session.player_id,
                            "answered_count": len(room.answered_player_ids),
                            "total_players": len([p for p in room.players.values() if p.connected]),
                            "all_answered": res.get("all_answered", False),
                        },
                    )

                elif event == "CHEAT_SUSPECTED":
                    # Фиксация расфокуса окна
                    reason = data.get("reason", "tab_switched")
                    if session.player_id in room.players:
                        room.players[session.player_id].blurred_count += 1
                        await ws_manager.broadcast_teacher(
                            room_code,
                            "CHEAT_ALERT",
                            {
                                "player_id": session.player_id,
                                "name": session.name,
                                "reason": reason,
                                "blurred_count": room.players[session.player_id].blurred_count,
                            },
                        )

    except WebSocketDisconnect:
        disc_session = ws_manager.disconnect(websocket, room_code)
        if disc_session and disc_session.role == UserRole.STUDENT:
            await room_state_engine.set_player_connection(token, False)
            await ws_manager.broadcast_room(
                room_code,
                "PLAYER_LEFT",
                {
                    "player_id": disc_session.player_id,
                    "name": disc_session.name,
                    "reason": "disconnect",
                    "total_players": len(room.players),
                },
            )
    except Exception as e:
        logger.error(f"Неожиданная ошибка в WS обработчике комнаты {room_code}: {e}")
        ws_manager.disconnect(websocket, room_code)
