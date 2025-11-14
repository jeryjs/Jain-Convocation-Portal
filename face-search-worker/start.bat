@echo off
echo ========================================
echo Face Search Worker - Quick Start
echo ========================================
echo.

REM Check if venv exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

echo Activating virtual environment...
call venv\Scripts\activate
echo.

REM Check if .env exists
if not exist ".env" (
    echo Creating .env from example...
    copy .env.example .env
    echo Please edit .env with your Redis credentials!
    pause
)

echo Installing dependencies...
pip install -r requirements.txt
echo.

echo ========================================
echo Starting Worker...
echo ========================================
echo.

python worker.py

pause
