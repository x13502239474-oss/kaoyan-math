@echo off
title Math Self-Study Site - LAN / Phone Access
cd /d "%~dp0"
echo.
echo   Allowing access from phones on the same Wi-Fi.
echo   Read the "From your phone" URL printed below.
echo.
python --version >nul 2>&1
if not errorlevel 1 goto RUNPY
py --version >nul 2>&1
if not errorlevel 1 goto RUNPYL
echo   [ERROR] Python not found. Install Python 3 first.
pause
exit /b 1
:RUNPY
python server.py --lan
goto END
:RUNPYL
py server.py --lan
goto END
:END
echo.
echo   Server stopped.
pause
