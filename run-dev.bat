@echo off
rem ======================================================================
rem  Culinary Blog - chay toan bo moi truong phat trien tren Windows.
rem  1. Docker: PostgreSQL + MailHog
rem  2. Backend .NET (http://localhost:5000) trong cua so rieng
rem  3. Frontend Next.js (http://localhost:3000) trong cua so rieng
rem  Cach dung:  run-dev.bat          (frontend che do dev)
rem              run-dev.bat prod     (build roi chay ban production)
rem ======================================================================
setlocal
chcp 65001 >nul
cd /d "%~dp0"

where docker >nul 2>nul || (echo [LOI] Chua cai Docker Desktop. & exit /b 1)
where dotnet >nul 2>nul || (echo [LOI] Chua cai .NET SDK 10. & exit /b 1)
where npm >nul 2>nul || (echo [LOI] Chua cai Node.js. & exit /b 1)

echo [1/3] Khoi dong PostgreSQL va MailHog...
docker compose up -d --wait
if errorlevel 1 (
    echo [LOI] Docker chua chay. Hay mo Docker Desktop roi thu lai.
    exit /b 1
)

echo [2/3] Chay backend tai http://localhost:5000 ...
start "Culinary Blog API" cmd /k "dotnet run --project src\CulinaryBlog.API"

echo [3/3] Chay frontend tai http://localhost:3000 ...
if not exist "frontend\node_modules" (
    echo      Cai thu vien frontend lan dau (npm ci)...
    pushd frontend
    call npm ci
    popd
)
if /i "%~1"=="prod" (
    start "Culinary Blog Web" cmd /k "cd frontend && npm run build && npm start"
) else (
    start "Culinary Blog Web" cmd /k "cd frontend && npm run dev"
)

echo.
echo Xong. Doi khoang 20 giay roi mo:
echo   Trang web      http://localhost:3000
echo   Tai lieu API   http://localhost:5000/scalar
echo   Hop thu email  http://localhost:8025
echo Kiem tra nhanh: powershell -File scripts\check-health.ps1
endlocal
