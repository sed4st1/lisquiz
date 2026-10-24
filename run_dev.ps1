# ==============================================================================
# Lisquiz Dev Launch Script
# ==============================================================================

Write-Host '==========================================================' -ForegroundColor Cyan
Write-Host '   Запуск Lisquiz: Интерактивная викторина для Сферума    ' -ForegroundColor Green
Write-Host '==========================================================' -ForegroundColor Cyan

 = 
 = Join-Path  'frontend'

Write-Host '[+] Запуск FastAPI бэкенда...' -ForegroundColor Cyan
Start-Process cmd -ArgumentList '/k', 'cd /d', , '&&', 'set PYTHONIOENCODING=utf-8', '&&', '.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload'

Write-Host '[+] Запуск Vite фронтенда...' -ForegroundColor Cyan
Start-Process cmd -ArgumentList '/k', 'cd /d', , '&&', 'npm run dev'

Write-Host ''
Write-Host '[SUCCESS] Серверы запущены в отдельных окнах!' -ForegroundColor Green
Write-Host '  -> Фронтенд:  http://localhost:3000' -ForegroundColor White
Write-Host '  -> Swagger:   http://127.0.0.1:8000/docs' -ForegroundColor Gray
