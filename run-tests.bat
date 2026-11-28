@echo off
rem ======================================================================
rem  Culinary Blog - chay cac kiem thu khong can server (giong CI GitHub).
rem    - Backend: build voi -warnaserror va unit test xUnit
rem    - Frontend: typecheck, lint, unit test tien ich
rem  Cach dung:  run-tests.bat        (tat ca)
rem              run-tests.bat be     (chi backend)
rem              run-tests.bat fe     (chi frontend)
rem ======================================================================
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set FAILED=0

if /i not "%~1"=="fe" call :backend
if /i not "%~1"=="be" call :frontend

echo.
if "%FAILED%"=="0" (
    echo ===== TAT CA KIEM THU DAT =====
) else (
    echo ===== CO %FAILED% BUOC THAT BAI, xem log o tren =====
)
exit /b %FAILED%

:backend
echo ===== Backend: build =====
dotnet build CulinaryBlog.slnx -warnaserror --nologo -v q || set /a FAILED+=1
echo ===== Backend: unit test =====
dotnet test tests\CulinaryBlog.UnitTests --nologo -v q || set /a FAILED+=1
exit /b 0

:frontend
pushd frontend
if not exist node_modules call npm ci
echo ===== Frontend: typecheck =====
call npm run typecheck || set /a FAILED+=1
echo ===== Frontend: lint =====
call npm run lint || set /a FAILED+=1
echo ===== Frontend: unit test =====
call npm run test:utils || set /a FAILED+=1
popd
exit /b 0
