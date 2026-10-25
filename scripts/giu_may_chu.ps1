# Giu may chu phong kham luon chay: chay java, java thoat (loi, MySQL chua san sang, bi tat) thi cho roi chay lai.
# Task Scheduler khong tu chay lai khi java thoat voi ma loi, nen vong lap nam o day.
# tu_chay.ps1 chep file nay vao C:\Users\Public\PhongKhamVietBac va tac vu PhongKhamVietBac chay no khi dang nhap.
# File chi dung ky tu ASCII: PowerShell 5.1 doc file khong BOM theo bang ma ANSI.
$ThuMuc = $PSScriptRoot
$Jar = Join-Path $ThuMuc 'phongkham.jar'
$CauHinh = Join-Path $ThuMuc 'application.yml'
$Socket = Join-Path $ThuMuc 'tmp'
$Javaw = Get-Content (Join-Path $ThuMuc 'javaw.txt') -TotalCount 1
$NhatKy = Join-Path $ThuMuc 'khoi-dong-lai.log'
$Cho = 10

while ($true) {
    $BatDau = Get-Date
    Add-Content $NhatKy "$($BatDau.ToString('yyyy-MM-dd HH:mm:ss')) khoi dong may chu"
    $p = Start-Process -FilePath $Javaw -PassThru -WindowStyle Hidden `
        -ArgumentList "-Djdk.net.unixdomain.tmpdir=$Socket", '-jar', $Jar, "--spring.config.additional-location=file:$CauHinh"
    $p.WaitForExit()
    # Chay duoc lau roi moi thoat thi chay lai nhanh; thoat ngay (MySQL chua len, loi cau hinh) thi gian dan toi 60 giay
    $Cho = if (((Get-Date) - $BatDau).TotalMinutes -gt 5) { 10 } else { [Math]::Min($Cho * 2, 60) }
    Add-Content $NhatKy "$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) may chu thoat (ma $($p.ExitCode)), chay lai sau $Cho giay"
    Start-Sleep -Seconds $Cho
}
