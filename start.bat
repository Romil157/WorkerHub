@echo off
echo ============================================
echo          WorkerHub - Starting Up
echo ============================================
echo.
echo [1/2] Starting Backend (port 5000)...
start "WorkerHub Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
echo [2/2] Starting Frontend (port 5173)...
timeout /t 3 /nobreak >nul
start "WorkerHub Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.
echo ============================================
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo ============================================
echo.
echo Both servers are starting in separate windows.
echo Close this window anytime - the servers will keep running.
