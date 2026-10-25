-- UC10.4 hoan tien: le tan lap va chi phieu hoan tien, quan tri vien duyet phieu vuot nguong (BR31)
INSERT INTO Quyen (MaQuyen, MaCode, TenQuyen, NhomChucNang) VALUES
  (28, 'HOAN_TIEN.LAP',   'Lập và chi phiếu hoàn tiền',         'Thanh toán'),
  (29, 'HOAN_TIEN.DUYET', 'Duyệt phiếu hoàn tiền vượt ngưỡng', 'Thanh toán');

INSERT INTO VaiTroQuyen (MaVaiTro, MaQuyen) VALUES (2, 28), (7, 29);
