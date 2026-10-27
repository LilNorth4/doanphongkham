-- Gia kham sat thuc te phong kham da khoa tu nhan o Thai Nguyen.
-- Gia BHYT: 36.500 d/lan, muc BHYT thanh toan tien kham cua phong kham da khoa tai Thai Nguyen
-- (QD 402/QD-BYT ngay 09/02/2026, Phong kham da khoa Truong DH Y Duoc Thai Nguyen).
-- Gia dich vu (benh nhan tu tra): kham thuong 120.000 d, chuyen khoa can dung cu soi / chuyen sau 150.000 d.
-- Lich hen, hoa don da lap giu gia tai thoi diem lap (BR09), khong bi anh huong.
UPDATE ChuyenKhoa SET PhiKhamCoBan = CASE MaCK
    WHEN 1 THEN 120000  -- Noi tong quat
    WHEN 2 THEN 120000  -- Nhi
    WHEN 3 THEN 150000  -- Tai Mui Hong
    WHEN 4 THEN 150000  -- Da lieu
    WHEN 5 THEN 150000  -- Tieu hoa
  END
WHERE MaCK BETWEEN 1 AND 5;

UPDATE DichVu dv JOIN ChuyenKhoa ck ON ck.MaCK = dv.MaCK
SET dv.GiaDichVu = ck.PhiKhamCoBan, dv.GiaBHYT = 36500
WHERE dv.LoaiDV = 'KHAM' AND dv.MaCK BETWEEN 1 AND 5;
