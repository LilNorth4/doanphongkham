-- Danh muc thuoc va ICD-10 sat thuc te phong kham da khoa ngoai tru (Noi, Nhi, Tai Mui Hong, Da lieu, Tieu hoa).
-- Ma ICD theo ICD-10 cua WHO, ten benh theo cach ghi tieng Viet trong bang ma ICD-10 Bo Y te dung.
-- Gia thuoc: gia ban le tham khao tai nha thuoc (d/don vi tinh); GiaBHYT: muc BHYT thanh toan cho thuoc generic
-- trong danh muc BHYT, NULL voi biet duoc / thuoc ngoai danh muc (thuc pham chuc nang, duoc lieu, my pham).
-- Hoat chat ghi ten chung (INN, cach ghi Duoc thu Viet Nam), nhieu hoat chat noi bang " + " de kiem tra BR35.

-- ---------- Don mau do kich ban kiem thu cu tao (ma ICD Zxx.x ghi nham "Viem ket mac", thuoc "Panadol xxx") ----------
DELETE FROM BenhICD
WHERE TenBenh = 'Viêm kết mạc' AND MaICD LIKE 'Z%'
  AND MaICD NOT IN (SELECT MaICD FROM (SELECT DISTINCT MaICD FROM HoSoBenhAn WHERE MaICD IS NOT NULL) d);

DELETE FROM Thuoc
WHERE TenThuoc REGEXP '^Panadol [0-9a-f]{3}$'
  AND MaThuoc NOT IN (SELECT MaThuoc FROM (SELECT MaThuoc FROM ChiTietDonThuoc UNION SELECT MaThuoc FROM ChiTietHoaDon
                                           WHERE MaThuoc IS NOT NULL) d);
-- Ban con nam trong don cu (khong xoa duoc) doi thanh biet duoc that cung hoat chat
UPDATE Thuoc SET TenThuoc = 'Panadol', HoatChat = 'Paracetamol', HamLuong = '500mg', DonViTinh = 'Viên',
                 DonGia = 1200, GiaBHYT = NULL
WHERE TenThuoc REGEXP '^Panadol [0-9a-f]{3}$';

-- ---------- Chuan hoa 12 thuoc co san ----------
UPDATE Thuoc SET DonGia = 1000,  GiaBHYT = 500  WHERE MaThuoc = 1;   -- Hapacol 500
UPDATE Thuoc SET DonGia = 1500,  GiaBHYT = 900  WHERE MaThuoc = 2;   -- Amoxicillin 500
UPDATE Thuoc SET DonGia = 1000,  GiaBHYT = 600  WHERE MaThuoc = 4;   -- Omeprazol 20
UPDATE Thuoc SET DonGia = 22000, GiaBHYT = 12000 WHERE MaThuoc = 6;  -- Zinnat 500 (biet duoc goc)
UPDATE Thuoc SET DonGia = 1200,  GiaBHYT = 700  WHERE MaThuoc = 7;   -- Ibuprofen 400
UPDATE Thuoc SET TenThuoc = 'Hydrocortison 1%', HamLuong = '1% - 15g' WHERE MaThuoc = 10;
UPDATE Thuoc SET HoatChat = 'Natri alginat + Natri bicarbonat + Calci carbonat', HamLuong = '500mg/267mg/160mg - 10ml'
WHERE MaThuoc = 12;                                                  -- Gaviscon

-- ---------- Bo sung thuoc thuong ke ngoai tru ----------
INSERT INTO Thuoc (TenThuoc, HoatChat, HamLuong, DonViTinh, DonGia, GiaBHYT) VALUES
  -- Ha sot, giam dau (dang tre em theo can nang)
  ('Hapacol 250',             'Paracetamol',                         '250mg',          'Gói',  2500,   1500),
  ('Hapacol 150',             'Paracetamol',                         '150mg',          'Gói',  2000,   1200),
  ('Efferalgan 500 sủi',      'Paracetamol',                         '500mg',          'Viên', 3500,   NULL),
  ('Alphachymotrypsin',       'Chymotrypsin',                        '4,2mg',          'Viên', 1200,   800),
  -- Khang sinh
  ('Klamentin 625',           'Amoxicillin + Acid clavulanic',       '500mg/125mg',    'Viên', 6000,   4500),
  ('Klamentin 250',           'Amoxicillin + Acid clavulanic',       '250mg/31,25mg',  'Gói',  5000,   3500),
  ('Zinnat 125',              'Cefuroxim',                           '125mg',          'Gói',  15000,  NULL),
  ('Azithromycin 500',        'Azithromycin',                        '500mg',          'Viên', 6000,   4000),
  ('Clarithromycin 500',      'Clarithromycin',                      '500mg',          'Viên', 8000,   5000),
  ('Metronidazol 250',        'Metronidazol',                        '250mg',          'Viên', 400,    250),
  ('Doxycyclin 100',          'Doxycyclin',                          '100mg',          'Viên', 1000,   600),
  -- Ho, long dom, chong di ung
  ('Acemuc 200',              'Acetylcystein',                       '200mg',          'Gói',  2500,   1500),
  ('Ambroxol 30',             'Ambroxol',                            '30mg',           'Viên', 800,    500),
  ('Cetirizin 10',            'Cetirizin',                           '10mg',           'Viên', 800,    500),
  ('Telfast 180',             'Fexofenadin',                         '180mg',          'Viên', 9000,   NULL),
  ('Aerius siro',             'Desloratadin',                        '0,5mg/ml - 60ml', 'Chai', 90000,  NULL),
  ('Medrol 16',               'Methylprednisolon',                   '16mg',           'Viên', 4500,   3000),
  -- Tai Mui Hong
  ('Avamys',                  'Fluticason furoat',                   '27,5mcg/liều - 120 liều', 'Lọ', 230000, NULL),
  ('Natri clorid 0,9%',       'Natri clorid',                        '0,9% - 10ml',    'Lọ',   3000,   2000),
  ('Otipax',                  'Phenazon + Lidocain',                 '4%/1% - 16g',    'Lọ',   85000,  NULL),
  -- Tim mach, noi tiet, chuyen hoa
  ('Losartan 50',             'Losartan',                            '50mg',           'Viên', 2000,   1200),
  ('Atorvastatin 20',         'Atorvastatin',                        '20mg',           'Viên', 2500,   1500),
  ('Diamicron MR 30',         'Gliclazid',                           '30mg',           'Viên', 4500,   3000),
  ('Allopurinol 300',         'Allopurinol',                         '300mg',          'Viên', 1500,   900),
  ('Colchicin 1',             'Colchicin',                           '1mg',            'Viên', 1000,   600),
  -- Tieu hoa
  ('Esomeprazol 40',          'Esomeprazol',                         '40mg',           'Viên', 4000,   2500),
  ('Domperidon 10',           'Domperidon',                          '10mg',           'Viên', 1500,   800),
  ('Buscopan 10',             'Hyoscin butylbromid',                 '10mg',           'Viên', 2500,   1500),
  ('Duspatalin 135',          'Mebeverin',                           '135mg',          'Viên', 5500,   3500),
  ('Smecta',                  'Diosmectit',                          '3g',             'Gói',  4000,   2500),
  ('Phosphalugel',            'Nhôm phosphat',                       '20% - 12,38g',   'Gói',  4500,   NULL),
  ('Oresol 245',              'Natri clorid + Kali clorid + Natri citrat + Glucose', '4,22g', 'Gói', 3000, 2000),
  ('Enterogermina',           'Bacillus clausii',                    '2 tỷ bào tử/5ml', 'Ống', 7000,   NULL),
  ('Duphalac',                'Lactulose',                           '10g/15ml',       'Gói',  5000,   3000),
  -- Da lieu
  ('Fucidin 2%',              'Acid fusidic',                        '2% - 15g',       'Tuýp', 95000,  NULL),
  ('Eumovate 0,05%',          'Clobetason butyrat',                  '0,05% - 5g',     'Tuýp', 30000,  NULL),
  ('Ketoconazol 2%',          'Ketoconazol',                         '2% - 15g',       'Tuýp', 40000,  25000),
  ('Aciclovir 800',           'Aciclovir',                           '800mg',          'Viên', 3500,   2000),
  ('Aciclovir 5%',            'Aciclovir',                           '5% - 5g',        'Tuýp', 15000,  10000),
  ('Klenzit-C',               'Adapalen + Clindamycin',              '0,1%/1% - 15g',  'Tuýp', 120000, NULL),
  ('Permethrin 5%',           'Permethrin',                          '5% - 30g',       'Tuýp', 45000,  NULL);

-- ---------- ICD-10: chuan hoa ten va bo sung benh thuong gap ngoai tru ----------
INSERT INTO BenhICD (MaICD, TenBenh) VALUES
  -- Ho hap, Tai Mui Hong
  ('J00',   'Viêm mũi họng cấp [cảm thường]'),
  ('J01.9', 'Viêm xoang cấp, không đặc hiệu'),
  ('J02.9', 'Viêm họng cấp, không đặc hiệu'),
  ('J03.9', 'Viêm amidan cấp, không đặc hiệu'),
  ('J05.0', 'Viêm thanh quản cấp tắc nghẽn [croup]'),
  ('J06.9', 'Nhiễm trùng đường hô hấp trên cấp, không đặc hiệu'),
  ('J11.1', 'Cúm có biểu hiện hô hấp khác, virus không được định danh'),
  ('J18.9', 'Viêm phổi, không đặc hiệu'),
  ('J20.9', 'Viêm phế quản cấp, không đặc hiệu'),
  ('J30.4', 'Viêm mũi dị ứng, không đặc hiệu'),
  ('J31.0', 'Viêm mũi mạn'),
  ('J32.9', 'Viêm xoang mạn, không đặc hiệu'),
  ('J35.0', 'Viêm amidan mạn'),
  ('J45.9', 'Hen, không đặc hiệu'),
  ('H60.9', 'Viêm tai ngoài, không đặc hiệu'),
  ('H61.2', 'Nút ráy tai'),
  ('H66.9', 'Viêm tai giữa, không đặc hiệu'),
  -- Tim mach, noi tiet, chuyen hoa, co xuong khop
  ('I10',   'Tăng huyết áp vô căn (nguyên phát)'),
  ('I20.9', 'Cơn đau thắt ngực, không đặc hiệu'),
  ('E11.9', 'Bệnh đái tháo đường không phụ thuộc insulin, không có biến chứng'),
  ('E78.0', 'Tăng cholesterol máu đơn thuần'),
  ('E78.5', 'Tăng lipid máu, không đặc hiệu'),
  ('E79.0', 'Tăng acid uric máu không có dấu hiệu viêm khớp và bệnh hạt tô phi'),
  ('M10.9', 'Bệnh gút, không đặc hiệu'),
  ('M17.9', 'Thoái hóa khớp gối, không đặc hiệu'),
  ('M54.5', 'Đau vùng thắt lưng'),
  ('R51',   'Đau đầu'),
  ('R50.9', 'Sốt, không đặc hiệu'),
  -- Tieu hoa
  ('A09',   'Tiêu chảy và viêm dạ dày - ruột có nguồn gốc nhiễm trùng'),
  ('K21.0', 'Bệnh trào ngược dạ dày - thực quản có viêm thực quản'),
  ('K21.9', 'Bệnh trào ngược dạ dày - thực quản không có viêm thực quản'),
  ('K25.9', 'Loét dạ dày, không xác định cấp hay mạn, không chảy máu hoặc thủng'),
  ('K29.5', 'Viêm dạ dày mạn, không đặc hiệu'),
  ('K29.7', 'Viêm dạ dày, không đặc hiệu'),
  ('K30',   'Khó tiêu chức năng'),
  ('K58.9', 'Hội chứng ruột kích thích không có tiêu chảy'),
  ('K59.0', 'Táo bón'),
  ('K76.0', 'Thoái hóa mỡ ở gan, không phân loại ở phần khác'),
  -- Nhi, truyen nhiem thuong gap
  ('A08.4', 'Nhiễm virus đường ruột, không đặc hiệu'),
  ('B01.9', 'Thủy đậu không có biến chứng'),
  ('B08.4', 'Bệnh tay, chân, miệng do virus đường ruột có viêm miệng'),
  -- Da lieu
  ('B02.9', 'Bệnh zona không có biến chứng'),
  ('B35.4', 'Nấm thân'),
  ('B36.0', 'Lang ben'),
  ('B86',   'Bệnh ghẻ'),
  ('L01.0', 'Chốc'),
  ('L20.9', 'Viêm da cơ địa, không đặc hiệu'),
  ('L21.9', 'Viêm da dầu, không đặc hiệu'),
  ('L23.9', 'Viêm da tiếp xúc dị ứng, không xác định nguyên nhân'),
  ('L50.9', 'Mày đay, không đặc hiệu'),
  ('L70.0', 'Trứng cá thông thường')
AS m ON DUPLICATE KEY UPDATE TenBenh = m.TenBenh;
