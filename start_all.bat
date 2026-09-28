@echo off
chcp 65001 > nul
echo ========================================================
echo   PANNs Audio Recognition - Khoi Dong He Thong
echo ========================================================
echo.
echo Dang khoi dong Backend API (FastAPI - Port 8000)...
start "PANNs Backend API" cmd /k "cd /d %~dp0 && py -3.10 -m uvicorn api_server:app --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak > nul

echo Dang khoi dong Frontend UI (React + Vite - Port 5173)...
start "PANNs React Frontend" cmd /k "cd /d %~dp0frontend && npx vite --host 127.0.0.1 --port 5173"

echo.
echo ========================================================
echo   He thong da khoi dong thanh cong!
echo   Dia chi truy cap Web: http://127.0.0.1:5173
echo   Dia chi Backend API: http://127.0.0.1:8000/docs
echo ========================================================
echo.
pause
