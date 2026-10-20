@echo off
rem Chay backend (Spring Boot, cong 8080) va giao dien (Vite, cong 5174).
rem - Server nao dang chay thi bo qua, khong khoi dong lai.
rem - Maven chay che do offline (-o): khong kiem tra thu vien tren mang moi lan.
rem Yeu cau: MySQL dang chay. Dong cua so tuong ung de tat server.

netstat -ano | findstr /r /c:":8080 .*LISTENING" >nul
if %errorlevel%==0 (
  echo Backend dang chay o cong 8080, bo qua.
) else (
  start "Backend - phongkham" /d "%~dp0backend" cmd /k mvnw.cmd -o -q compile exec:java
)

netstat -ano | findstr /r /c:":5174 .*LISTENING" >nul
if %errorlevel%==0 (
  echo Giao dien dang chay o cong 5174, bo qua.
) else (
  start "Frontend - phongkham" /d "%~dp0web" cmd /k npm run dev -- --port 5174
)

rem Cho backend mo cong 8080 (toi da ~90 giay) roi mo trinh duyet
set /a dem=0
:cho
netstat -ano | findstr /r /c:":8080 .*LISTENING" >nul && goto xong
set /a dem+=1
if %dem% geq 45 goto xong
timeout /t 2 /nobreak >nul
goto cho
:xong
start "" http://localhost:5174
