-- BR35: thuoc trung di ung (canh bao muc cao) chi ke duoc khi bac si nhap ly do; ly do luu cung dong don thuoc
ALTER TABLE ChiTietDonThuoc
  ADD COLUMN LyDoBoQuaCanhBao VARCHAR(255) NULL COMMENT 'BR35: lý do vẫn kê thuốc trùng dị ứng đã ghi nhận'
  AFTER SoNgayDung;
