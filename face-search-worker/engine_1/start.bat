@echo off
echo ========================================
echo Face Search Worker - Quick Start
echo ========================================
echo.

REM Check if venv exists
@REM if not exist "venv\" (
@REM     echo Creating virtual environment...
@REM     python -m venv venv
@REM     echo.
@REM )

@REM echo Activating virtual environment...
@REM call venv\Scripts\activate
@REM echo.

conda activate tf

REM Check if .env exists
if not exist ".env" (
    echo Creating .env from example...
    copy .env.example .env
    echo Please edit .env with your Redis credentials!
    pause
)

@REM echo Installing dependencies...
@REM @REM pip install -r requirements.txt
@REM echo.

echo ========================================
echo Starting Worker...
echo ========================================
echo.

python worker.py

pause
