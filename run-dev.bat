@echo off
rem ======================================================================
rem  Culinary Blog - Lab 3: chay toan bo chuong trinh tren mot may Windows bat ky.
rem  Can cai: Docker Desktop, .NET SDK 10.
rem  Cach dung:  run-dev.bat          (chay)
rem              run-dev.bat check    (chi kiem tra may da du dieu kien chua)
rem  May da cai san PostgreSQL o cong 5432:  set POSTGRES_PORT=5433 roi chay lai.
rem ======================================================================
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "DB_NAME=culinaryblog_lab3"
if not defined POSTGRES_PORT set "POSTGRES_PORT=5432"

where docker >nul 2>nul || (echo [LOI] Chua cai Docker Desktop: https://www.docker.com/products/docker-desktop & exit /b 1)
where dotnet >nul 2>nul || (echo [LOI] Chua cai .NET SDK 10: https://dotnet.microsoft.com/download & exit /b 1)
dotnet --list-sdks | findstr /b /c:"10." >nul || (
    echo [LOI] Can .NET SDK 10.x, may nay dang co:
    dotnet --list-sdks
    exit /b 1
)
docker info >nul 2>nul || (
    echo [LOI] Docker Desktop chua chay. Mo Docker Desktop, cho bao Engine running roi chay lai.
    exit /b 1
)
netstat -ano | findstr /r /c:":5000 .*LISTENING" >nul && (
    echo [LOI] Cong 5000 dang bi chuong trinh khac chiem. Tat chuong trinh do roi chay lai.
    exit /b 1
)
echo [OK] May da du phan mem can thiet.
if /i "%~1"=="check" exit /b 0

echo [1/2] Khoi dong PostgreSQL bang Docker (cong %POSTGRES_PORT%)...
docker compose up -d --wait
if errorlevel 1 (
    echo [LOI] Khong khoi dong duoc PostgreSQL.
    echo       Neu bao "port is already allocated": may da cai PostgreSQL rieng o cong %POSTGRES_PORT%.
    echo       Cach sua: set POSTGRES_PORT=5433 roi chay lai run-dev.bat
    exit /b 1
)
rem Doi cong PostgreSQL thi chuoi ket noi cua API cung phai doi theo.
if not "%POSTGRES_PORT%"=="5432" set "ConnectionStrings__Default=Host=127.0.0.1;Port=%POSTGRES_PORT%;Database=%DB_NAME%;Username=culinary;Password=culinary_dev_only"

echo [2/2] Chay backend tai http://localhost:5000 (lan dau tu tao database %DB_NAME% va du lieu mau)...
start "Culinary Blog API" cmd /k "dotnet run --project src\CulinaryBlog.API"

set "OPEN_URL=http://localhost:5000"

echo Dang cho backend san sang...
for /l %%i in (1,1,90) do (
    curl -s -o nul http://localhost:5000/ && goto ready
    rem Cho 2 giay. Khong dung timeout vi lenh nay loi khi cua so khong nhan ban phim (terminal cua IDE).
    ping -n 3 127.0.0.1 >nul
)
echo [CANH BAO] Backend chua phan hoi sau 3 phut. Xem loi trong cua so "Culinary Blog API".
exit /b 1

:ready
echo [OK] Backend da chay. Mo %OPEN_URL%
start "" "%OPEN_URL%"
exit /b 0
