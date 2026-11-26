@echo off
title MindPulse Full-Stack Launcher
echo ========================================================
echo Starting MindPulse Full-Stack AI Platform
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo ========================================================

start "MindPulse Backend" cmd /k "python -m uvicorn api:app --reload --host 127.0.0.1 --port 8000"
timeout /t 2 /nobreak >nul
start "MindPulse Frontend" cmd /k "cd frontend && pnpm run dev"

echo Services launched in separate windows!
pause
