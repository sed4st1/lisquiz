# ==============================================================================
# Lisquiz (ЛисийКвиз) - 1-Click Launch Script (ECC Hackathon Standard)
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Запуск Lisquiz: Интерактивная викторина для Сферума    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$RootDir = $PSScriptRoot

# 1. Проверка виртуального окружения Python
$VenvPython = Join-Path $RootDir ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "[!] Виртуальное окружение Python не найдено. Создание venv..." -ForegroundColor Yellow
    python -m venv (Join-Path $RootDir ".venv")
    & $VenvPython -m pip install -r (Join-Path $RootDir "requirements.txt")
}

# 2. Запуск бэкенда FastAPI в отдельном окне
Write-Host "[+] Запуск бэкенда FastAPI (http://127.0.0.1:8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootDir'; set PYTHONIOENCODING=utf-8; .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

# 3. Запуск фронтенда Vite React в отдельном окне
Write-Host "[+] Запуск фронтенда Vite (http://localhost:3000)..." -ForegroundColor Cyan
$FrontendDir = Join-Path $RootDir "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir'; npm run dev"

Write-Host "`n[SUCCESS] Серверы успешно запущены!" -ForegroundColor Green
Write-Host "  -> Веб-приложение:  http://localhost:3000" -ForegroundColor White
Write-Host "  -> API Документация: http://127.0.0.1:8000/docs" -ForegroundColor Gray
Write-Host "  -> WebSocket:        ws://127.0.0.1:8000/ws/rooms/{code}" -ForegroundColor Gray
Write-Host "`nУдачной демонстрации на хакатоне! 🦊🌲" -ForegroundColor Yellow
