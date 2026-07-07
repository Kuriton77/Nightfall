@echo off
title Nightfall
cd /d "%~dp0"

echo ==========================
echo      Starting Nightfall
echo ==========================
echo.

:: Installiert fehlende Pakete (falls node_modules fehlt)
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo Failed to install dependencies.
        pause
        exit /b
    )
)

:: Startet das Projekt
call npm start

echo.
echo Nightfall has exited.
pause