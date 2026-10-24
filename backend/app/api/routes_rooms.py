import io
import csv
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Response
from pydantic import BaseModel, Field
from ..models.schemas import Quiz, Question, AnswerOption, GameRoom, RoomStatus, GapReport
from ..services.room_state_engine import room_state_engine
from ..services.ws_manager import ws_manager
from ..services.bank_service import bank_service

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])

# Стандартная демонстрационная викторина по умолчанию для быстрого старта
DEMO_DEFAULT_QUIZ = Quiz(
    id="quiz_demo_default",
    title="Математика (5 класс) — Обыкновенные дроби",
    subject="Математика",
    grade=5,
    topic="Обыкновенные дроби",
    questions=[
        Question(
            id=1,
            text="Чему равна сумма $\\frac{1}{4} + \\frac{2}{4}$?",
            explanation="Складываем числители при одинаковом знаменателе: (1 + 2) / 4 = 3/4.",
            time_limit_sec=20,
            topic="Сложение дробей",
            options=[
                AnswerOption(id=0, text="3/4", is_correct=True, symbol="triangle", color="red"),
                AnswerOption(id=1, text="3/8", is_correct=False, symbol="diamond", color="blue"),
                AnswerOption(id=2, text="2/4", is_correct=False, symbol="circle", color="yellow"),
                AnswerOption(id=3, text="1/2", is_correct=False, symbol="square", color="green"),
            ],
        ),
        Question(
            id=2,
            text="Какая дробь называется правильной?",
            explanation="У правильной дроби числитель строго меньше знаменателя.",
            time_limit_sec=20,
            topic="Понятие правильной дроби",
            options=[
                AnswerOption(id=0, text="Числитель меньше знаменателя", is_correct=True, symbol="triangle", color="red"),
                AnswerOption(id=1, text="Числитель больше знаменателя", is_correct=False, symbol="diamond", color="blue"),
                AnswerOption(id=2, text="Числитель равен знаменателю", is_correct=False, symbol="circle", color="yellow"),
                AnswerOption(id=3, text="Знаменатель равен 0", is_correct=False, symbol="square", color="green"),
            ],
        ),
        Question(
            id=3,
            text="Сократите дробь $\\frac{6}{8}$ до несократимой:",
            explanation="Делим числитель и знаменатель на 2: получаем 3/4.",
            time_limit_sec=20,
            topic="Основное свойство дроби",
            options=[
                AnswerOption(id=0, text="3/4", is_correct=True, symbol="triangle", color="red"),
                AnswerOption(id=1, text="1/2", is_correct=False, symbol="diamond", color="blue"),
                AnswerOption(id=2, text="2/3", is_correct=False, symbol="circle", color="yellow"),
                AnswerOption(id=3, text="4/5", is_correct=False, symbol="square", color="green"),
            ],
        ),
    ],
)


class RoomCreateRequest(BaseModel):
    quiz_id: Optional[str] = None
    quiz: Optional[Quiz] = None
    teacher_name: str = "Учитель"
    teacher_pseudonym_id: str = "teacher_host"
    subject: Optional[str] = None
    grade: Optional[int] = None
    topic: Optional[str] = None
    question_count: Optional[int] = None
    textbook_id: Optional[str] = None
    paragraph_num: Optional[int] = None


class JoinRoomRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, examples=["Иван К."])
    avatar: Optional[str] = Field("fox_smart", examples=["fox_smart"])
    pseudonym_id: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_room(req: Optional[RoomCreateRequest] = None):
    """Создание новой игровой комнаты учителем с выдачей 6-значного PIN-кода."""
    teacher_name = req.teacher_name if req else "Учитель"
    teacher_p_id = req.teacher_pseudonym_id if req else "teacher_host"

    if req and req.quiz:
        target_quiz = req.quiz
    elif req and req.textbook_id and req.paragraph_num:
        # Прямая выборка заданий из БД учебников РФ
        from ..services.textbook_service import textbook_service
        cnt = max(1, min(20, int(req.question_count or 5)))
        tb_res = textbook_service.get_questions_by_paragraph(
            textbook_id=req.textbook_id,
            paragraph_num=req.paragraph_num,
            limit=cnt
        )
        tb_questions = []
        for qd in tb_res.get("questions", []):
            opts = [
                AnswerOption(id=o["id"], text=o["text"], is_correct=o.get("is_correct", False))
                for o in qd.get("options", [])
            ]
            tb_questions.append(Question(
                id=qd["id"],
                text=qd["text"],
                options=opts,
                explanation=qd.get("explanation", ""),
                tier=qd.get("tier", 1),
                is_boss=qd.get("is_boss", False),
                time_limit_sec=qd.get("time_limit_sec", 20),
                topic=tb_res.get("topic", req.topic or "Параграф учебника"),
            ))
        if cnt >= 3 and len(tb_questions) >= cnt:
            tb_questions[-1].tier = 3
            tb_questions[-1].is_boss = True

        book_title = tb_res.get("textbook_title") or req.subject or "Учебник"
        para_title = tb_res.get("paragraph_title") or f"§ {req.paragraph_num}"
        target_quiz = Quiz(
            id=f"quiz_tb_{req.textbook_id}_{req.paragraph_num}",
            title=f"{book_title} — § {req.paragraph_num}. {para_title}".strip(" — § ."),
            subject=req.subject or "Школьный предмет",
            grade=int(req.grade or 7),
            topic=para_title,
            questions=tb_questions,
        )
    elif req and (req.subject or req.grade or req.question_count or req.topic):
        subj = req.subject or "Математика"
        grd = int(req.grade or 7)
        top = req.topic or "Тематический тест"
        cnt = max(1, min(20, int(req.question_count or 5)))

        # Интеграция с ML 2.0 AI & Bank конвейером Ивана (Кошельник Иван)
        from ..services.ai_service import AIService
        from ..models.schemas import QuizCreateRequest
        try:
            ai_svc = AIService()
            target_quiz = await ai_svc.generate_quiz(
                QuizCreateRequest(
                    subject=subj,
                    grade=grd,
                    topic=top,
                    question_count=cnt
                )
            )
            # Отмечаем финальный вопрос как Босс (Tier 3)
            if target_quiz and target_quiz.questions and len(target_quiz.questions) >= 3:
                target_quiz.questions[-1].tier = 3
                target_quiz.questions[-1].is_boss = True
        except Exception:
            # Fallback на банк заданий
            bank_q = bank_service.get_questions_by_topic(subject=subj, grade=grd, topic=top, count=cnt)
            if len(bank_q) < cnt:
                demo_pool = list(DEMO_DEFAULT_QUIZ.questions)
                idx = len(bank_q) + 1
                while len(bank_q) < cnt:
                    template_q = demo_pool[(len(bank_q)) % len(demo_pool)]
                    cloned = template_q.model_copy(deep=True)
                    cloned.id = idx
                    cloned.topic = top
                    cloned.subject = subj
                    cloned.grade = grd
                    bank_q.append(cloned)
                    idx += 1

            if cnt >= 3 and len(bank_q) >= cnt:
                bank_q[-1].tier = 3
                bank_q[-1].is_boss = True

            target_quiz = Quiz(
                id=f"quiz_{abs(hash(f'{subj}_{grd}_{top}_{cnt}')) % 1000000}",
                title=f"{subj} ({grd} класс) — {top}",
                subject=subj,
                grade=grd,
                topic=top,
                questions=bank_q[:cnt],
            )
    else:
        target_quiz = DEMO_DEFAULT_QUIZ

    room, teacher_token = await room_state_engine.create_room(
        quiz=target_quiz,
        teacher_name=teacher_name,
        teacher_pseudonym_id=teacher_p_id,
    )

    return {
        "room_code": room.room_code,
        "status": room.status.value,
        "quiz_title": room.quiz.title,
        "subject": room.quiz.subject,
        "grade": room.quiz.grade,
        "total_questions": len(room.quiz.questions),
        "teacher_token": teacher_token,
        "ws_url": f"/ws/rooms/{room.room_code}?token={teacher_token}",
    }


@router.get("/{room_code}")
async def get_room_info(room_code: str):
    """Получение публичной информации о комнате перед входом."""
    room = await room_state_engine.get_room(room_code)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Комната с кодом {room_code} не найдена или завершена",
        )

    return {
        "room_code": room.room_code,
        "status": room.status.value,
        "quiz_title": room.quiz.title,
        "subject": room.quiz.subject,
        "grade": room.quiz.grade,
        "total_questions": len(room.quiz.questions),
        "players_count": len([p for p in room.players.values() if p.connected]),
    }


@router.get("/{room_code}/quiz", response_model=Quiz)
async def get_room_quiz(room_code: str):
    """Получение текущей викторины комнаты для предпросмотра и редактирования учителем."""
    room = await room_state_engine.get_room(room_code)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Комната {room_code} не найдена",
        )
    return room.quiz


@router.put("/{room_code}/quiz")
async def update_room_quiz(room_code: str, quiz: Quiz):
    """Обновление викторины комнаты учителем перед стартом (в лобби)."""
    try:
        room = await room_state_engine.update_room_quiz(room_code, quiz)
        return {
            "status": "ok",
            "quiz_title": room.quiz.title,
            "subject": room.quiz.subject,
            "grade": room.quiz.grade,
            "total_questions": len(room.quiz.questions),
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{room_code}/join")
async def join_room(room_code: str, req: JoinRoomRequest):
    """Подключение ученика к комнате в лобби."""
    room = await room_state_engine.get_room(room_code)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Комната {room_code} не найдена",
        )

    try:
        player, token = await room_state_engine.join_room(
            room_code=room_code,
            name=req.name,
            avatar=req.avatar,
            pseudonym_id=req.pseudonym_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    return {
        "player_id": player.id,
        "name": player.name,
        "avatar": player.avatar,
        "session_token": token,
        "ws_url": f"/ws/rooms/{room_code}?token={token}",
    }


@router.get("/{room_code}/report", response_model=GapReport)
async def get_gap_report(room_code: str):
    """Итоговая аналитическая матрица дефицитов класса (Class Gap Heatmap)."""
    report = await room_state_engine.generate_gap_report(room_code)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Отчет для комнаты {room_code} не найден или викторина еще не проводилась",
        )
    return report


@router.get("/{room_code}/export/csv")
async def export_gap_report_csv(room_code: str):
    """Экспорт аналитической матрицы дефицитов класса в CSV (с UTF-8 BOM для Microsoft Excel)."""
    report = await room_state_engine.generate_gap_report(room_code)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Отчет для комнаты {room_code} не найден",
        )

    output = io.StringIO()
    output.write("\ufeff")  # UTF-8 BOM для корректного отображения кириллицы в Excel
    writer = csv.writer(output, delimiter=";")

    writer.writerow(["Отчет по викторине Лисквиз (Lisquiz)", report.quiz_title])
    writer.writerow(["Код комнаты", report.room_code])
    writer.writerow(["Всего участников", report.total_participants])
    writer.writerow(["Средний балл", report.average_score])
    writer.writerow(["Общая точность класса (%)", f"{report.class_accuracy_percent}%"])
    writer.writerow(["Рост Классной Рощи (%)", f"{report.grove_growth_percent}%"])
    writer.writerow(["Рекомендация к домашнему заданию", report.homework_recommendation])
    if report.flagged_cheaters:
        writer.writerow(["Ученики с расфокусом окна (>1)", ", ".join(report.flagged_cheaters)])
    writer.writerow([])

    writer.writerow([
        "№ Вопроса",
        "Текст вопроса",
        "Тема",
        "Верно (%)",
        "Ошибок (чел)",
        "Типичный неверный ответ (дистрактор)",
        "Методический пробел / Пояснение",
    ])

    for q in report.questions_stats:
        writer.writerow([
            q.question_id,
            q.text,
            q.topic or "",
            f"{q.correct_percent}%",
            q.mistake_count,
            q.dominant_distractor or "—",
            q.cognitive_gap or "—",
        ])

    csv_data = output.getvalue()
    filename = f"lisquiz_report_{room_code}.csv"

    return Response(
        content=csv_data.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


class RoomControlRequest(BaseModel):
    action: str = Field(..., description="START_GAME | NEXT_QUESTION | REVEAL_RESULTS | FINISH")
    token: Optional[str] = Field(None, description="Токен учителя для авторизации действия")


@router.post("/{room_code}/control")
async def control_room(room_code: str, req: RoomControlRequest):
    """Управление ходом игры со стороны учителя (REST дублер WebSocket команд)."""
    room = await room_state_engine.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    action = req.action.upper()
    if action == "START_GAME":
        await room_state_engine.start_game(room_code)
        await room_state_engine.start_question(room_code, 0)
        cur_q = room.quiz.questions[0]
        cur_q_student = cur_q.model_copy(deep=True)
        for opt in cur_q_student.options:
            opt.is_correct = False
        await ws_manager.broadcast_room(
            room_code,
            "START_QUESTION",
            {
                "question_index": 0,
                "question": cur_q_student.model_dump(),
                "time_limit_sec": cur_q.time_limit_sec,
            },
        )
        return {"status": "ok", "action": action, "room_status": room.status.value}

    elif action == "REVEAL_RESULTS":
        results = await room_state_engine.reveal_results(room_code)
        await ws_manager.broadcast_room(room_code, "QUESTION_RESULTS", results)
        return {"status": "ok", "action": action, "results": results}

    elif action == "NEXT_QUESTION":
        res = await room_state_engine.next_question(room_code)
        if res.get("has_next"):
            q_idx = res["question_index"]
            await room_state_engine.start_question(room_code, q_idx)
            cur_q = room.quiz.questions[q_idx]
            cur_q_student = cur_q.model_copy(deep=True)
            for opt in cur_q_student.options:
                opt.is_correct = False
            await ws_manager.broadcast_room(
                room_code,
                "START_QUESTION",
                {
                    "question_index": q_idx,
                    "question": cur_q_student.model_dump(),
                    "time_limit_sec": cur_q.time_limit_sec,
                },
            )
        else:
            await ws_manager.broadcast_room(room_code, "GAME_FINISHED", {"room_code": room_code})
        return {"status": "ok", "action": action, "res": res}

    elif action == "FINISH":
        await room_state_engine.transition_state(room_code, RoomStatus.FINISHED)
        await ws_manager.broadcast_room(room_code, "GAME_FINISHED", {"room_code": room_code})
        return {"status": "ok", "action": action, "room_status": "finished"}

    else:
        raise HTTPException(status_code=400, detail=f"Неизвестное действие: {req.action}")
