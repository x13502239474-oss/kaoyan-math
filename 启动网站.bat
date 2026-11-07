@echo off
title Math Self-Study Site
cd /d "%~dp0"
echo.
echo   Starting local server... (close this window to stop)
echo.
python --version >nul 2>&1
if not errorlevel 1 goto RUNPY
py --version >nul 2>&1
if not errorlevel 1 goto RUNPYL
echo   [ERROR] Python not found. Install Python 3, or just double-click index.html
echo           (all features work without a server; PWA install needs http).
pause
exit /b 1
:RUNPY
python server.py
goto END
:RUNPYL
py server.py
goto END
:END
echo.
echo   Server stopped.
pause
