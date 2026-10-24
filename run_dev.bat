@echo off
title Lisquiz Dev Runner
echo ==================================================
echo   Lisquiz (ЛисийКвиз) - Dev Server Starter
echo ==================================================

echo [+] Starting FastAPI Backend (http://127.0.0.1:8000)...
start "Lisquiz Backend" cmd /k "cd /d %~dp0 && set PYTHONIOENCODING=utf-8 && .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [+] Starting Vite Frontend (http://localhost:3000)...
start "Lisquiz Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo [SUCCESS] Servers launched in separate windows!
echo   - Web App:   http://localhost:3000
echo   - API Docs:  http://127.0.0.1:8000/docs
echo.
