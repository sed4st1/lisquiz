import io
import sys
import os
import time
import asyncio
from PIL import Image, ImageDraw, ImageFont

# Добавляем backend в sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.ocr_service import ocr_service
from app.services.ai_service import ai_service
from app.main import app
import httpx

def create_synthetic_textbook_page() -> bytes:
    """
    Создаёт тестовое изображение страницы учебника (имитация фото).
    """
    # 900 x 500 белое полотно с четким текстом учебника
    img = Image.new("RGB", (950, 520), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    font_path = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    font = ImageFont.truetype(font_path, 22) if os.path.exists(font_path) else ImageFont.load_default()

    lines = [
        "Параграф 14. Закон Архимеда и плавание тел",
        "На тело, погружённое в жидкость или газ, действует выталкивающая сила,",
        "равная весу жидкости или газа в объёме погружённой части тела.",
        "Формула выталкивающей силы Архимеда: F = p * g * V,",
        "где p — плотность жидкости, g — ускорение свободного падения, V — объём тела.",
        "Если плотность тела меньше плотности жидкости, тело всплывает на поверхность.",
        "Если плотность тела больше плотности жидкости, тело тонет на дно сосуда."
    ]

    y = 40
    for line in lines:
        draw.text((45, y), line, fill=(15, 15, 15), font=font)
        y += 58

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

async def main():
    print("=" * 65)
    print("🧠 ТЕСТИРОВАНИЕ ML-ПАЙПЛАЙНА OCR (RAPIDOCR CPU + GIGACHAT)")
    print("=" * 65)

    # 1. Генерация тестового изображения
    print("\n[1/4] Подготовка тестовой страницы учебника (Физика, 7 класс)...")
    img_bytes = create_synthetic_textbook_page()
    print(f"✅ Изображение создано ({len(img_bytes)} байт)")

    # 2. Тестирование изолированного OCR-движка
    print("\n[2/4] Запуск RapidOCR нейросети (PP-OCRv4 ONNX на CPU)...")
    t0 = time.time()
    ocr_res = ocr_service.extract_text(img_bytes)
    t_elapsed = round((time.time() - t0) * 1000, 1)

    print(f"⏱️ Время локального OCR-инференса: {t_elapsed} мс")
    print(f"📊 Средняя достоверность (Confidence): {ocr_res.confidence * 100:.1f}%")
    print(f"📝 Распознано строк: {ocr_res.lines_count}")

    # 3. Тестирование сквозного пайплайна Vision & Multimodal GigaChat-Pro
    print("\n[3/4] Сквозной пайплайн: передача фото в GigaChat-Pro Vision...")
    t0 = time.time()
    quiz, meta = await ai_service.generate_quiz_from_image(
        image_bytes=img_bytes,
        subject="Физика",
        grade=7,
        topic="Закон Архимеда",
        question_count=2
    )
    t_gen = round(time.time() - t0, 2)
    print(f"⏱️ Время сквозной генерации (Vision + LLM): {t_gen} сек")
    print(f"🎉 Викторина успешно создана: '{quiz.title}' (Модель: {meta.get('model')})")

    for q in quiz.questions:
        print(f"\nВопрос #{q.id}: {q.text}")
        for opt in q.options:
            mark = "⭐" if opt.is_correct else "  "
            print(f"   {mark} [{opt.symbol}/{opt.color}] {opt.text}")
        print(f"   💡 Пояснение: {q.explanation}")

    # 4. Тестирование API эндпоинта FastAPI
    print("\n[4/4] Тестирование FastAPI эндпоинта /api/quiz/generate-from-image...")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        files = {
            "file": ("textbook_page.png", img_bytes, "image/png")
        }
        data = {
            "subject": "Физика",
            "grade": "7",
            "topic": "Закон Архимеда",
            "question_count": "2"
        }
        resp = await client.post("/api/quiz/generate-from-image", files=files, data=data, timeout=50.0)
        print("HTTP Status Code:", resp.status_code)
        assert resp.status_code == 200, resp.text
        res_json = resp.json()
        print("Model used:", res_json["vision"]["model"])
        print("Questions count in API response:", len(res_json["quiz"]["questions"]))

    print("\n" + "=" * 65)
    print("✅ ВСЕ ТЕСТЫ ML VISION & OCR ПАЙПЛАЙНА УСПЕШНО ЗАВЕРШЕНЫ!")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(main())
