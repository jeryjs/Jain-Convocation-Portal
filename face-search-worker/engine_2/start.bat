@echo off
echo ========================================
echo Face Search Worker 2 - face_recognition
echo ========================================
echo.

echo Activating conda ml environment...
call conda activate ml
echo.

REM Check if .env exists
if not exist ".env" (
    echo Creating .env from example...
    copy .env.example .env
    echo Please edit .env with your Redis credentials!
    pause
)

echo ========================================
echo Starting Worker 2 (face_recognition)...
echo ========================================
echo.

python worker.py

pause
