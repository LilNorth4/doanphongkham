@echo off
rem Build giao dien + backend, chay chung cong 8080 va tu khoi dong moi lan dang nhap Windows.
rem Chay lai file nay sau moi lan sua code de cap nhat ban dang chay.
rem Tat han (khong tu bat lai): cai_dat_tu_chay.bat /dung    Go bo: cai_dat_tu_chay.bat /gobo
if /i "%~1"=="/gobo" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\tu_chay.ps1" -GoBo
) else if /i "%~1"=="/dung" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\tu_chay.ps1" -Dung
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\tu_chay.ps1"
  if not errorlevel 1 start "" http://localhost:8080
)
pause
