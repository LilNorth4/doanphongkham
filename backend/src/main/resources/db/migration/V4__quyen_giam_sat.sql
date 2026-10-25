-- Quan tri vien giam sat hoat dong tiep don va kham benh o che do chi xem (khong thao tac thay le tan, bac si)
INSERT INTO Quyen (MaQuyen, MaCode, TenQuyen, NhomChucNang) VALUES
  (26, 'LICH_HEN.XEM', 'Xem toàn bộ lịch hẹn',      'Giám sát'),
  (27, 'KHAM.XEM',     'Xem lịch khám của bác sĩ',  'Giám sát');

INSERT INTO VaiTroNhomChucNang (MaVaiTro, NhomChucNang) VALUES (7, 'Giám sát');

INSERT INTO VaiTroQuyen (MaVaiTro, MaQuyen) VALUES (7, 26), (7, 27);
