@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title PANNs Audio Recognition - Setup & Runner

echo =====================================================================
echo       PANNs Audio Recognition - He Thong Khoi Dong Tu Dong
echo =====================================================================
echo.

cd /d "%~dp0"

:: 1. Kiem tra Python
echo [1/4] Kiem tra moi truong Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    where py >nul 2>nul
    if %errorlevel% neq 0 (
        echo [LOI] May cua ban chua cai dat Python hoac chua tick 'Add Python to PATH'!
        echo Vui long cai dat Python tai https://www.python.org/downloads/
        pause
        exit /b 1
    ) else (
        set "PY_CMD=py"
    )
) else (
    set "PY_CMD=python"
)

for /f "tokens=*" %%i in ('%PY_CMD% --version') do set "PYTHON_VER=%%i"
echo   - Tim thay: !PYTHON_VER!

:: 2. Kiem tra va cai dat thu vien Python
echo.
echo [2/4] Kiem tra thu vien Python can thiet...
%PY_CMD% -c "import torch, torchaudio, librosa, soundfile, fastapi, uvicorn, torchlibrosa, h5py, pandas" >nul 2>nul
if %errorlevel% neq 0 (
    echo   - Phat hien thieu thu vien. Dang tu dong cai dat tu requirements.txt...
    %PY_CMD% -m pip install -r requirements.txt
    if !errorlevel! neq 0 (
        echo   - Thu cai dat PyTorch phu hop...
        %PY_CMD% -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
        %PY_CMD% -m pip install -r requirements.txt
    )
) else (
    echo   - Cac thu vien Python da day du va san sang!
)

:: 3. Kiem tra Frontend Node.js / NPM
echo.
echo [3/4] Kiem tra Frontend (React + Vite)...
if not exist "%~dp0frontend\node_modules" (
    echo   - Thu muc node_modules chua co. Dang tien hanh 'npm install'...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
) else (
    echo   - Dependencies Frontend da san sang.
)

:: 4. Kiem tra file weights Cnn14
echo.
echo [4/4] Kiem tra pretrained checkpoint model...
if not exist "%~dp0Cnn14_mAP=0.431.pth" (
    echo   [CANH BAO] Chua tim thay Cnn14_mAP=0.431.pth trong thu muc goc!
    echo   Vui long dam bao file checkpoint model duoc tai ve de nhan dien am thanh.
) else (
    echo   - Checkpoint Cnn14_mAP=0.431.pth da ton tai!
)

echo.
echo =====================================================================
echo   Dang khoi dong he thong Web & API...
echo =====================================================================
echo.

:: Khoi dong Backend API
echo [Khoi dong Backend API] (Port 8000)...
start "PANNs Backend API" cmd /k "cd /d "%~dp0" && %PY_CMD% -m uvicorn api_server:app --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak > nul

:: Khoi dong Frontend React
echo [Khoi dong Frontend UI] (Port 5173)...
start "PANNs React Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1 --port 5173"

echo.
echo =====================================================================
echo   He thong da khoi dong xong!
echo   * Giao dien Web:   http://127.0.0.1:5173
echo   * Tai lieu API:    http://127.0.0.1:8000/docs
echo =====================================================================
echo.
pause
