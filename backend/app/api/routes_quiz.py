from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, Depends, Header
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from ..models.schemas import Quiz, QuizCreateRequest, Question
from ..services.ai_service import ai_service
from ..services.bank_service import bank_service
from ..services.auth_service import auth_service
from ..services import quiz_service
from ..db.session import get_db

router = APIRouter()

SUBJECTS = [
    {"id": "math", "name": "Математика", "grades": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]},
    {"id": "nature", "name": "Окружающий мир", "grades": [1, 2, 3, 4]},
    {"id": "russian", "name": "Русский язык", "grades": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]},
    {"id": "physics", "name": "Физика", "grades": [7, 8, 9, 10, 11]},
    {"id": "chemistry", "name": "Химия", "grades": [8, 9, 10, 11]},
    {"id": "biology", "name": "Биология", "grades": [5, 6, 7, 8, 9, 10, 11]},
    {"id": "history", "name": "История", "grades": [5, 6, 7, 8, 9, 10, 11]},
    {"id": "geography", "name": "География", "grades": [5, 6, 7, 8, 9, 10, 11]},
    {"id": "social", "name": "Обществознание", "grades": [6, 7, 8, 9, 10, 11]},
    {"id": "cs", "name": "Информатика", "grades": [5, 6, 7, 8, 9, 10, 11]},
    {"id": "literature", "name": "Литература", "grades": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]},
    {"id": "english", "name": "Английский язык", "grades": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]},
]

@router.get("/subjects")
async def get_subjects():
    """Получить список школьных предметов по стандартам ФРП РФ."""
    return {"subjects": SUBJECTS}

@router.get("/bank/stats")
async def get_bank_stats():
    """Получить статистику локального банка заданий Lisquiz (количество по предметам и классам)."""
    return bank_service.get_stats()

@router.get("/bank/topics")
async def get_bank_topics(
    subject: Optional[str] = Query(None, description="Фильтр по предмету"),
    grade: Optional[int] = Query(None, description="Фильтр по классу")
):
    """Получить список доступных тем из 6 313 проверенных заданий базы Ивана."""
    topics = bank_service.get_available_topics(subject=subject, grade=grade)
    return {
        "total_topics": len(topics),
        "topics": topics
    }

@router.get("/bank/search", response_model=List[Question])
async def search_bank_questions(
    query: str = Query(..., min_length=1, description="Поисковый запрос (тема или ключевые слова)"),
    subject: Optional[str] = Query(None, description="Фильтр по предмету"),
    grade: Optional[int] = Query(None, description="Фильтр по классу"),
    limit: int = Query(10, ge=1, le=50)
):
    """Полнотекстовый поиск (FTS5) по верифицированному банку заданий."""
    return bank_service.search_questions(query=query, subject=subject, grade=grade, limit=limit)

@router.post("/generate", response_model=Quiz)
async def generate_quiz(request: QuizCreateRequest):
    """
    Сгенерировать интерактивную викторину через GigaChat API
    по предмету, классу и теме из Федеральных рабочих программ (ФРП).
    """
    try:
        quiz = await ai_service.generate_quiz(request)
        return quiz
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка генерации викторины: {str(e)}"
        )

@router.post("/ocr-preview")
async def ocr_preview(file: UploadFile = File(...)):
    """
    Распознавание текста с фото страницы учебника/конспекта без генерации викторины (предпросмотр).
    """
    try:
        contents = await file.read()
        from ..services.ocr_service import ocr_service
        result = ocr_service.extract_text(contents)
        return {
            "text": result.text,
            "confidence": result.confidence,
            "lines_count": result.lines_count,
            "is_clear": result.is_clear
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка обработки изображения: {str(e)}"
        )

@router.post("/generate-from-image")
async def generate_quiz_from_image(
    file: UploadFile = File(...),
    subject: str = Form(...),
    grade: int = Form(5),
    topic: Optional[str] = Form(None),
    question_count: int = Form(5)
):
    """
    Сквозная генерация викторины из фото учебника или конспекта (Vision OCR + GigaChat).
    """
    try:
        contents = await file.read()
        quiz, ocr_res = await ai_service.generate_quiz_from_image(
            image_bytes=contents,
            subject=subject,
            grade=grade,
            topic=topic,
            question_count=question_count
        )
        return {
            "quiz": quiz,
            "vision": ocr_res
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации: {str(e)}")



@router.get("/catalog/topics")
async def get_catalog_topics(subject: Optional[str] = None, grade: Optional[int] = None):
    """
    Предзагруженный справочник школьных предметов, классов (1-11) и типовых тем по ФРП РФ.
    """
    catalog = [
        {"subject": "Математика", "grade": 5, "topics": ["Обыкновенные дроби", "Сложение и вычитание дробей", "Умножение дробей", "Десятичные дроби", "Проценты", "Уравнения"]},
        {"subject": "Математика", "grade": 6, "topics": ["Отрицательные числа", "Пропорции и отношения", "Прямая и обратная пропорциональность", "Линейные уравнения", "Координатная плоскость"]},
        {"subject": "Математика", "grade": 7, "topics": ["Одночлены и многочлены", "Формулы сокращенного умножения", "Линейные уравнения с двумя переменными", "Смежные и вертикальные углы", "Признаки равенства треугольников"]},
        {"subject": "Физика", "grade": 7, "topics": ["Строение вещества", "Механическое движение и скорость", "Масса тела и плотность вещества", "Сила тяжести и вес", "Давление твердых тел, жидкостей и газов", "Закон Архимеда"]},
        {"subject": "Физика", "grade": 8, "topics": ["Тепловые явления и внутренняя энергия", "Количество теплоты и удельная теплоемкость", "Электрический ток и закон Ома", "Сопротивление проводников", "Оптические явления и линзы"]},
        {"subject": "Русский язык", "grade": 5, "topics": ["Фонетика и графика", "Морфемика и словообразование", "Имя существительное", "Имя прилагательное", "Глагол и спряжение"]},
        {"subject": "Русский язык", "grade": 6, "topics": ["Лексикология и фразеология", "Имя числительное", "Местоимение", "Причастие и деепричастие"]},
        {"subject": "Биология", "grade": 5, "topics": ["Живой организм: строение и изучение", "Клеточное строение организмов", "Царства живой природы", "Бактерии и грибы"]},
        {"subject": "Биология", "grade": 6, "topics": ["Строение и жизнедеятельность растений", "Корень и побег", "Цветок и плод", "Фотосинтез и дыхание растений"]},
        {"subject": "История", "grade": 5, "topics": ["Первобытные собиратели и охотники", "Древний Египет", "Древнее Двуречье", "Древняя Греция", "Древний Рим"]},
        {"subject": "Информатика", "grade": 7, "topics": ["Информация и информационные процессы", "Компьютер: универсальная машина", "Двоичное кодирование", "Алгоритмы и исполнители"]},
        {"subject": "Химия", "grade": 8, "topics": ["Первоначальные химические понятия", "Периодический закон Д.И. Менделеева", "Строение атома", "Химическая связь", "Простые и сложные вещества"]},
    ]
    if subject:
        catalog = [c for c in catalog if c["subject"].lower() == subject.lower()]
    if grade:
        catalog = [c for c in catalog if c["grade"] == grade]
    return {"catalog": catalog}


def _extract_teacher_id(authorization: Optional[str] = None) -> str:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = auth_service.decode_access_token(token)
        if payload and payload.get("pseudonym_id"):
            return payload["pseudonym_id"]
    return "teacher_host"


@router.get("", response_model=List[Dict[str, Any]])
async def get_all_quizzes(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Получение всех доступных викторин из базы данных:
    проверенные шаблоны РФ + викторины, созданные текущим учителем.
    """
    teacher_id = _extract_teacher_id(authorization)
    return await quiz_service.list_quizzes(db, teacher_id)


@router.post("", response_model=Dict[str, Any])
async def save_quiz_to_db(
    quiz: Quiz,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Создание или обновление викторины прямо в базе данных с привязкой к учителю.
    """
    teacher_id = _extract_teacher_id(authorization)
    quiz_dict = quiz.model_dump()
    saved = await quiz_service.save_or_update_quiz(db, quiz_dict, teacher_id)
    return saved


@router.get("/{quiz_id}", response_model=Dict[str, Any])
async def get_quiz_from_db(
    quiz_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Получение структуры сохраненной викторины из БД по ID.
    """
    quiz_data = await quiz_service.get_quiz_by_id(db, quiz_id)
    if not quiz_data:
        raise HTTPException(status_code=404, detail=f"Викторина '{quiz_id}' не найдена в базе данных")
    return quiz_data


@router.put("/{quiz_id}", response_model=Dict[str, Any])
async def update_quiz_in_db(
    quiz_id: str,
    quiz: Quiz,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Редактирование викторины в базе данных.
    """
    teacher_id = _extract_teacher_id(authorization)
    quiz_dict = quiz.model_dump()
    quiz_dict["id"] = quiz_id
    saved = await quiz_service.save_or_update_quiz(db, quiz_dict, teacher_id)
    return saved


@router.delete("/{quiz_id}")
async def delete_quiz_from_db(
    quiz_id: str,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Удаление викторины из базы данных.
    """
    teacher_id = _extract_teacher_id(authorization)
    deleted = await quiz_service.delete_quiz(db, quiz_id, teacher_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Викторина '{quiz_id}' не найдена")
    return {"status": "deleted", "quiz_id": quiz_id}

