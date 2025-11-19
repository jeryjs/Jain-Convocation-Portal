@echo off
REM Face Search Worker Deployment Script for Windows

echo ============================================================
echo Face Search Worker - Deployment
echo ============================================================
echo.
echo Select engine:
echo   1. DeepFace (requires 'tf' conda environment)
echo   2. face_recognition (requires 'ml' conda environment)
echo.

set /p choice="Enter choice (1/2): "

if "%choice%"=="1" (
    echo.
    echo Activating 'tf' environment...
    call conda activate tf
    if errorlevel 1 (
        echo Error: Failed to activate 'tf' environment
        pause
        exit /b 1
    )
    echo Starting worker with DeepFace engine...
    python worker.py --engine deepface
) else if "%choice%"=="2" (
    echo.
    echo Activating 'ml' environment...
    call conda activate ml
    if errorlevel 1 (
        echo Error: Failed to activate 'ml' environment
        pause
        exit /b 1
    )
    echo Starting worker with face_recognition engine...
    python worker.py --engine face_recognition
) else (
    echo.
    echo Invalid choice. Please run again and select 1 or 2.
    pause
    exit /b 1
)

pause
