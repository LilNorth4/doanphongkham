# Cai dat / go bo che do tu chay: giao dien + API chay chung cong 8080, tu khoi dong khi dang nhap Windows.
#   powershell -ExecutionPolicy Bypass -File scripts\tu_chay.ps1            # build va cai dat (chay lai sau moi lan sua code)
#   powershell -ExecutionPolicy Bypass -File scripts\tu_chay.ps1 -Dung      # tat han (khong tu bat lai), VD de chay ban phat trien
#   powershell -ExecutionPolicy Bypass -File scripts\tu_chay.ps1 -GoBo      # go bo
# File chi dung ky tu ASCII: PowerShell 5.1 doc file khong BOM theo bang ma ANSI.
param([switch]$GoBo, [switch]$Dung)

$ErrorActionPreference = 'Stop'
$TenTacVu = 'PhongKhamVietBac'
$Cong = 8080
$DuAn = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $DuAn 'backend'
$Web = Join-Path $DuAn 'web'
# Thu muc chay khong dau, khong khoang trang (C:\Users\Public\PhongKhamVietBac): Task Scheduler bao
# "directory name is invalid" voi thu muc lam viec cua du an, va Java tren Windows loi socket noi bo
# ("Unable to establish loopback connection") trong thu muc tam cua tai khoan nay.
# Jar duoc chep ra day nen build lai khong bi khoa file.
$ThuMucChay = Join-Path $env:PUBLIC $TenTacVu
$Jar = Join-Path $ThuMucChay 'phongkham.jar'
$Log = Join-Path $ThuMucChay 'backend.log'
$ThuMucSocket = Join-Path $ThuMucChay 'tmp'
$CauHinh = Join-Path $ThuMucChay 'application.yml'
$GiuMayChu = Join-Path $ThuMucChay 'giu_may_chu.ps1'

function Dung-MayChu {
    if (Get-ScheduledTask -TaskName $TenTacVu -ErrorAction SilentlyContinue) {
        Stop-ScheduledTask -TaskName $TenTacVu -ErrorAction SilentlyContinue
    }
    # Tat vong lap giu may chu truoc (neu khong no chay lai java), roi toi java: dung tac vu khong tat tien trinh con
    foreach ($ten in 'powershell.exe', 'javaw.exe', 'java.exe') {
        Get-CimInstance Win32_Process -Filter "Name = '$ten'" |
            Where-Object { $_.CommandLine -like "*$GiuMayChu*" -or $_.CommandLine -like "*$Jar*" } |
            ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    }
}

if ($Dung) {
    Dung-MayChu
    Write-Host 'Da tat may chu. Chay chay_phongkham.bat de bat lai (dang nhap Windows lan sau cung tu bat).'
    return
}

if ($GoBo) {
    Dung-MayChu
    if (Get-ScheduledTask -TaskName $TenTacVu -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TenTacVu -Confirm:$false
    }
    Write-Host "Da go bo tu chay. Thu muc $ThuMucChay co the xoa tay neu muon."
    return
}

$CongBan = Get-NetTCPConnection -State Listen -LocalPort $Cong -ErrorAction SilentlyContinue
if ($CongBan) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId = $($CongBan[0].OwningProcess)"
    if ($p.CommandLine -notlike "*$Jar*") {
        Write-Host "Cong $Cong dang bi chuong trinh khac dung (PID $($p.ProcessId): $($p.Name))." -ForegroundColor Yellow
        Write-Host "Hay tat no (VD cua so backend cu chay bang mvnw) roi chay lai." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host '1/4 Build giao dien (web/dist)...'
Push-Location $Web
try {
    if (-not (Test-Path 'node_modules')) { npm install --no-audit --no-fund; if ($LASTEXITCODE) { exit 1 } }
    npm run build
    if ($LASTEXITCODE) { Write-Host 'Build giao dien loi.' -ForegroundColor Red; exit 1 }
} finally { Pop-Location }

Write-Host '2/4 Dong goi backend (jar)...'
Push-Location $Backend
try {
    & .\mvnw.cmd -q -DskipTests package
    if ($LASTEXITCODE) { Write-Host 'Dong goi backend loi.' -ForegroundColor Red; exit 1 }
} finally { Pop-Location }
$JarMoi = Get-ChildItem (Join-Path $Backend 'target') -Filter 'phongkham-*.jar' |
    Where-Object { $_.Name -notlike '*.original' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1

Write-Host '3/4 Dang ky tu chay khi dang nhap Windows...'
Dung-MayChu
New-Item -ItemType Directory -Force $ThuMucChay | Out-Null
New-Item -ItemType Directory -Force $ThuMucSocket | Out-Null
Copy-Item $JarMoi.FullName $Jar -Force

# Duong dan tuyet doi toi .env, giao dien da build, anh tai len (van la backend\du-lieu-tai-len).
# Ghi UTF-8 khong BOM; Java doc duong dan tieng Viet trong file binh thuong.
function Gach($x) { $x.Replace('\', '/') }
$Yml = @"
spring:
  config:
    import: "optional:file:$(Gach (Join-Path $DuAn '.env'))[.properties]"
phongkham:
  thu-muc-web: "$(Gach (Join-Path $Web 'dist'))"
  thu-muc-tai-len: "$(Gach (Join-Path $Backend 'du-lieu-tai-len'))"
logging:
  file:
    name: "$(Gach $Log)"
"@
[IO.File]::WriteAllText($CauHinh, $Yml, (New-Object Text.UTF8Encoding $false))

$Java = (Get-Command java).Source
$Javaw = Join-Path (Split-Path $Java) 'javaw.exe'
if (-not (Test-Path $Javaw)) { $Javaw = $Java }
Set-Content (Join-Path $ThuMucChay 'javaw.txt') $Javaw -Encoding ASCII
Copy-Item (Join-Path $PSScriptRoot 'giu_may_chu.ps1') $GiuMayChu -Force
# Tac vu chay vong lap giu may chu (an cua so); vong lap chay java va chay lai khi java thoat
$HanhDong = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File $GiuMayChu"
$NguoiDung = "$env:USERDOMAIN\$env:USERNAME"
$KichHoat = New-ScheduledTaskTrigger -AtLogOn -User $NguoiDung
$KichHoat.Delay = 'PT20S'   # cho MySQL khoi dong xong
$CaiDat = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$ChuThe = New-ScheduledTaskPrincipal -UserId $NguoiDung -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TenTacVu -Action $HanhDong -Trigger $KichHoat -Settings $CaiDat -Principal $ChuThe `
    -Description 'Phong kham Viet Bac: giao dien va API tai http://localhost:8080' -Force | Out-Null

Write-Host '4/4 Khoi dong may chu...'
Start-ScheduledTask -TaskName $TenTacVu
$San = $false
for ($i = 0; $i -lt 60 -and -not $San; $i++) {
    Start-Sleep -Seconds 2
    try { Invoke-RestMethod -TimeoutSec 3 "http://localhost:$Cong/api/cau-hinh" | Out-Null; $San = $true } catch { }
}
if (-not $San) {
    Write-Host "May chu chua len sau 2 phut. Xem log: $Log" -ForegroundColor Red
    exit 1
}
Write-Host "Xong. Mo http://localhost:$Cong (tu chay moi lan dang nhap Windows). Log: $Log" -ForegroundColor Green
