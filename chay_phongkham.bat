@echo off
rem Mo phong kham tai http://localhost:8080 (giao dien va API chung mot cong).
rem May chu tu chay khi dang nhap Windows (cai bang cai_dat_tu_chay.bat); file nay chi khoi dong lai neu no dang tat.
rem Yeu cau: MySQL dang chay.

rem CSDL mong muon lay tu .env (mac dinh phongkham)
set "DB_MONG_MUON=phongkham"
for /f "tokens=1,* delims==" %%a in ('findstr /b /c:"DB_NAME=" "%~dp0.env" 2^>nul') do set "DB_MONG_MUON=%%b"

netstat -ano | findstr /r /c:":8080 .*LISTENING" >nul
if %errorlevel%==0 goto dang_chay

schtasks /query /tn PhongKhamVietBac >nul 2>&1
if errorlevel 1 (
  echo Chua cai che do tu chay. Hay chay cai_dat_tu_chay.bat mot lan.
  pause
  goto :eof
)
echo May chu dang tat, dang khoi dong...
schtasks /run /tn PhongKhamVietBac >nul

rem Cho may chu mo cong 8080 (toi da ~90 giay)
set /a dem=0
:cho
netstat -ano | findstr /r /c:":8080 .*LISTENING" >nul && goto dang_chay
set /a dem+=1
if %dem% geq 45 (
  echo May chu chua len. Xem log tai %PUBLIC%\PhongKhamVietBac\backend.log
  pause
  goto :eof
)
rem ping thay cho timeout: timeout khong cho khi dau vao bi chuyen huong (chay tu script khac)
ping -n 3 127.0.0.1 >nul
goto cho

:dang_chay
call :kiem_tra_csdl
start "" http://localhost:8080
goto :eof

rem Backend dang chay san co the la ban khac (VD chay thu voi DB_NAME khac): du lieu nhap vao se nam o CSDL do.
rem Chi kiem tra duoc khi backend bat CHE_DO_THU=1 (API /api/cau-hinh moi tra ten CSDL).
:kiem_tra_csdl
set "DB_DANG_DUNG="
for /f "delims=" %%c in ('powershell -NoProfile -Command "try { (Invoke-RestMethod -TimeoutSec 5 http://localhost:8080/api/cau-hinh).csdl } catch { }"') do set "DB_DANG_DUNG=%%c"
if not defined DB_DANG_DUNG goto :eof
if /i "%DB_DANG_DUNG%"=="%DB_MONG_MUON%" (
  echo Backend dang luu vao CSDL %DB_DANG_DUNG%.
  goto :eof
)
echo.
echo  CANH BAO: backend dang chay luu vao CSDL "%DB_DANG_DUNG%", khong phai "%DB_MONG_MUON%" trong .env.
echo  Du lieu ban nhap se KHONG nam trong %DB_MONG_MUON%. Hay tat may chu do (cai_dat_tu_chay.bat chay lai se bao) roi thu lai.
echo.
pause
goto :eof
