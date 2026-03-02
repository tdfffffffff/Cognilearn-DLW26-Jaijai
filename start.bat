@echo off
setlocal

set ROOT=%~dp0

echo Starting CogniLearn Backend...
start "CogniLearn - Backend" cmd /k "cd /d "%ROOT%Backend" && call venv\Scripts\activate.bat && uvicorn mindmap.app:app --reload --host 0.0.0.0 --port 8000"

echo Starting CogniLearn Frontend...
start "CogniLearn - Frontend" cmd /k "cd /d "%ROOT%Frontend" && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Frontend: http://localhost:8080
echo.
pause
