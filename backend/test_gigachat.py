import asyncio
import sys
import os

# Добавляем корневую директорию backend в sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.services.gigachat_auth import gigachat_auth
from app.services.gigachat_client import gigachat_client
from app.services.ai_service import ai_service
from app.models.schemas import QuizCreateRequest

async def main():
    print("=" * 60)
    print("🦊 ТЕСТИРОВАНИЕ ИНТЕГРАЦИИ SBER GIGACHAT ДЛЯ ЛИСКВИЗ")
    print("=" * 60)
    print(f"Провайдер LLM: {settings.LLM_PROVIDER}")
    print(f"Модель: {settings.GIGACHAT_MODEL}")
    print(f"Scope: {settings.GIGACHAT_SCOPE}")
    print(f"Client ID: {settings.GIGACHAT_CLIENT_ID[:8]}...{settings.GIGACHAT_CLIENT_ID[-4:] if settings.GIGACHAT_CLIENT_ID else 'None'}")
    print("-" * 60)

    # 1. Проверка получения токена
    print("\n[1/3] Запрос OAuth токена доступа у Сбера...")
    try:
        token = await gigachat_auth.get_token()
        print(f"✅ Токен успешно получен! Первые 15 символов: {token[:15]}...")
    except Exception as e:
        print(f"❌ Ошибка получения токена: {e}")
        return 1

    # 2. Проверка повторного вызова (проверка кэша)
    print("\n[2/3] Проверка кэширования токена...")
    token2 = await gigachat_auth.get_token()
    if token == token2:
        print("✅ Токен успешно возвращен из кэша в памяти (без лишних сетевых запросов).")
    else:
        print("⚠️ Токен обновился unexpectedly.")

    # 3. Полный педагогический тест генерации викторины
    print("\n[3/3] Генерация викторины по ФРП: Математика, 5 класс, 'Сложение дробей' (3 вопроса)...")
    req = QuizCreateRequest(
        subject="Математика",
        grade=5,
        topic="Сложение и вычитание обыкновенных дробей",
        question_count=3
    )

    try:
        quiz = await ai_service.generate_quiz(req)
        print(f"\n🎉 Викторина успешно сгенерирована!")
        print(f"ID: {quiz.id}")
        print(f"Название: {quiz.title}")
        print(f"Количество вопросов: {len(quiz.questions)}\n")

        for idx, q in enumerate(quiz.questions):
            print(f"--- Вопрос #{q.id}: {q.text} ---")
            for opt in q.options:
                marker = "⭐ [ВЕРНО]" if opt.is_correct else "  [НЕВЕРНО]"
                print(f"   {marker} [{opt.symbol} / {opt.color}] {opt.text}")
            print(f"   💡 Пояснение: {q.explanation}\n")

    except Exception as e:
        print(f"❌ Ошибка генерации викторины: {e}")
        import traceback
        traceback.print_exc()
        return 1

    print("=" * 60)
    print("✅ ВСЕ ТЕСТЫ GIGACHAT УСПЕШНО ПРОЙДЕНЫ!")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
