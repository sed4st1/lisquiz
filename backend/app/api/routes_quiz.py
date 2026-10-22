from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from typing import List, Optional, Dict
from ..models.schemas import Quiz, QuizCreateRequest, Question
from ..services.ai_service import ai_service
from ..services.bank_service import bank_service

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

