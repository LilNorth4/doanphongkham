"""Kiem thu tong hop qua API (102 truong hop, nhom 11: danh gia, gop y). Chay lai nhieu lan duoc, trong gio lam viec (can khung gio con trong hom nay).
    python scripts/kiem_thu_api.py [http://127.0.0.1:8080]   -> ghi vao CSDL cua may chu do, ket qua ra ket_qua.json
"""
import datetime, json, struct, sys, traceback, urllib.error, urllib.request, uuid, zlib

sys.stdout.reconfigure(encoding='utf-8')
B = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8080').rstrip('/') + '/api'
KQ = []
NGAY = datetime.date.today()


def goi(tok, duong, pt='GET', du=None, tep=None):
    hd = {'Authorization': 'Bearer ' + tok} if tok else {}
    data = None
    if tep:
        bien = uuid.uuid4().hex
        phan = []
        for ten, gt in tep.items():
            # Chuỗi là trường văn bản; bộ (tên tệp, nội dung, kiểu) là tệp; danh sách là nhiều tệp cùng tên trường
            if isinstance(gt, str):
                phan.append(f'--{bien}\r\nContent-Disposition: form-data; name="{ten}"\r\n\r\n{gt}\r\n'.encode())
                continue
            for tentep, noi_dung, kieu in (gt if isinstance(gt, list) else [gt]):
                phan.append(f'--{bien}\r\nContent-Disposition: form-data; name="{ten}"; filename="{tentep}"\r\n'
                        f'Content-Type: {kieu}\r\n\r\n'.encode() + noi_dung + b'\r\n')
        data = b''.join(phan) + f'--{bien}--\r\n'.encode()
        hd['Content-Type'] = 'multipart/form-data; boundary=' + bien
    elif du is not None:
        data = json.dumps(du).encode()
        hd['Content-Type'] = 'application/json'
    req = urllib.request.Request(B + duong, method=pt, data=data, headers=hd)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read()
            return r.status, (json.loads(body) if body else None)
    except urllib.error.HTTPError as e:
        body = e.read()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {'raw': body[:200].decode(errors='replace')}


def dn(dinh_danh, mk='Phongkham123'):
    s, d = goi(None, '/auth/dang-nhap', 'POST', {'dinh_danh': dinh_danh, 'mat_khau': mk})
    return d.get('Token') if s == 200 else None


def tc(ma, nhom, mo_ta, ham):
    try:
        ok, ghi_chu = ham()
    except Exception as e:
        ok, ghi_chu = False, 'Ngoai le: ' + ''.join(traceback.format_exception_only(type(e), e)).strip()
    KQ.append({'ma': ma, 'nhom': nhom, 'mo_ta': mo_ta, 'dat': bool(ok), 'ghi_chu': ghi_chu})
    print(('DAT  ' if ok else 'LOI  ') + ma, mo_ta, '|', ghi_chu)


def loi(s, d, ma=400, chua=None):
    """Mong doi loi ma `ma`, thong bao chua `chua`."""
    msg = (d or {}).get('detail', '') if isinstance(d, dict) else ''
    return s == ma and (chua is None or chua.lower() in msg.lower()), f'{s} {msg}'


def png():
    raw = b''.join(b'\x00' + bytes([40, 120, 200]) * 32 for _ in range(32))
    c = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + c(b'IHDR', struct.pack('>IIBBBBB', 32, 32, 8, 2, 0, 0, 0)) + \
        c(b'IDAT', zlib.compress(raw)) + c(b'IEND', b'')


T = {}  # token theo vai tro
S = {}  # gia tri dung chung giua cac test

# ===================== 1. Xac thuc, phan quyen =====================
N = '1. Xác thực và phân quyền'


def t_dang_nhap():
    for k, e in [('admin', 'admin@vietbac.vn'), ('letan', 'lan.nt@vietbac.vn'), ('bs', 'minh.tv@vietbac.vn'),
                 ('xn', 'ha.lt@vietbac.vn'), ('cdha', 'huy.pq@vietbac.vn'), ('ns', 'tuan.dm@vietbac.vn'),
                 ('bn', 'an.hv@gmail.com'), ('bn2', 'uyen.pt@gmail.com'), ('bn3', 'son.nv@gmail.com')]:
        T[k] = dn(e)
    thieu = [k for k, v in T.items() if not v]
    return not thieu, 'thiếu: ' + ', '.join(thieu) if thieu else 'đăng nhập đủ 9 tài khoản mẫu'


tc('XT01', N, 'Đăng nhập email các vai trò', t_dang_nhap)
tc('XT02', N, 'Đăng nhập bằng số điện thoại', lambda: (bool(dn('0912345678')), 'an.hv qua SĐT'))
tc('XT03', N, 'Sai mật khẩu báo lỗi chung', lambda: loi(*goi(None, '/auth/dang-nhap', 'POST',
    {'dinh_danh': 'an.hv@gmail.com', 'mat_khau': 'SaiMatKhau1'}), 400, 'không đúng'))
tc('XT04', N, 'Tài khoản bị khóa không đăng nhập được', lambda: (lambda r: (r[0] == 400 and 'khóa' in r[1].get('detail', ''), f"{r[0]} {r[1].get('detail')}"))(
    goi(None, '/auth/dang-nhap', 'POST', {'dinh_danh': 'vinh.dv@gmail.com', 'mat_khau': 'Phongkham123'})))
tc('XT05', N, 'Tài khoản chưa xác thực email bị yêu cầu OTP', lambda: (lambda r: ('xác thực' in json.dumps(r[1], ensure_ascii=False).lower(), f"{r[0]} {json.dumps(r[1], ensure_ascii=False)[:120]}"))(
    goi(None, '/auth/dang-nhap', 'POST', {'dinh_danh': 'lananh.mt@gmail.com', 'mat_khau': 'Phongkham123'})))
tc('XT06', N, 'Không có token gọi API cần đăng nhập → 401', lambda: loi(*goi(None, '/auth/toi'), 401))
tc('XT07', N, 'Bệnh nhân gọi API lễ tân → 403', lambda: loi(*goi(T['bn'], '/le-tan/lich-hen'), 403))
tc('XT08', N, 'Bác sĩ gọi API quản trị tài khoản → 403', lambda: loi(*goi(T['bs'], '/tai-khoan'), 403))


def t_dang_ky():
    sdt = '09' + str(uuid.uuid4().int)[:8]
    email = f'kiemthu.{sdt}@gmail.com'
    S['dk_email'], S['dk_sdt'] = email, sdt
    s, d = goi(None, '/auth/dang-ky', 'POST', {'ho_ten': 'Nguyễn Kiểm Thử', 'ngay_sinh': '1995-05-05', 'gioi_tinh': 'NAM',
                                                'sdt': sdt, 'email': email, 'mat_khau': 'MatKhau123'})
    if s != 200:
        return False, f'{s} {d}'
    s, thu = goi(None, f'/dev/hop-thu?dinh_danh={email}')
    import re
    ma = next((m.group(0) for t in (thu or []) for m in [re.search(r'\b\d{6}\b', json.dumps(t, ensure_ascii=False))] if m), None)
    if not ma:
        return False, 'không thấy OTP trong hộp thư giả lập'
    s, d = goi(None, '/auth/xac-thuc-email', 'POST', {'dinh_danh': email, 'ma_otp': ma})
    tok = dn(email, 'MatKhau123')
    return s == 200 and bool(tok), f'xác thực {s}, đăng nhập {"được" if tok else "không"}'


tc('XT09', N, 'Đăng ký bệnh nhân mới + xác thực OTP', t_dang_ky)
tc('XT10', N, 'Đăng ký trùng email bị chặn', lambda: loi(*goi(None, '/auth/dang-ky', 'POST', {
    'ho_ten': 'Trùng', 'ngay_sinh': '1990-01-01', 'gioi_tinh': 'NU', 'sdt': '0999888777', 'email': 'an.hv@gmail.com',
    'mat_khau': 'MatKhau123'})))
tc('XT11', N, 'Mật khẩu yếu bị chặn (BR15)', lambda: loi(*goi(None, '/auth/dang-ky', 'POST', {
    'ho_ten': 'Yếu', 'ngay_sinh': '1990-01-01', 'gioi_tinh': 'NU', 'sdt': '0999888776', 'email': 'yeu.mk@gmail.com',
    'mat_khau': 'abcdefgh'})))


def t_quen_mk():
    email = S['dk_email']
    s, _ = goi(None, '/auth/quen-mat-khau', 'POST', {'dinh_danh': email})
    import re
    s2, thu = goi(None, f'/dev/hop-thu?dinh_danh={email}')
    ma = None
    for t in thu or []:
        m = re.search(r'\b\d{6}\b', json.dumps(t, ensure_ascii=False))
        if m and ('khôi phục' in json.dumps(t, ensure_ascii=False).lower() or 'mật khẩu' in json.dumps(t, ensure_ascii=False).lower()):
            ma = m.group(0)
            break
    if not ma:
        return False, f'quên mk {s}, không thấy OTP'
    s3, d3 = goi(None, '/auth/dat-lai-mat-khau', 'POST', {'dinh_danh': email, 'ma_otp': ma, 'mat_khau_moi': 'MatKhauMoi123'})
    return s3 == 200 and bool(dn(email, 'MatKhauMoi123')), f'đặt lại {s3} {d3}'


tc('XT12', N, 'Quên mật khẩu → OTP → đặt lại → đăng nhập mật khẩu mới', t_quen_mk)


def t_doi_mk_dang_xuat():
    email = S['dk_email']
    tok = dn(email, 'MatKhauMoi123')
    s, d = goi(tok, '/auth/doi-mat-khau', 'POST', {'mat_khau_cu': 'MatKhauMoi123', 'mat_khau_moi': 'MatKhau456'})
    tok2 = dn(email, 'MatKhau456')
    s2, _ = goi(tok2, '/auth/dang-xuat', 'POST')
    s3, _ = goi(tok2, '/auth/toi')
    return s == 200 and s2 == 200 and s3 == 401, f'đổi {s}, đăng xuất {s2}, token cũ {s3}'


tc('XT13', N, 'Đổi mật khẩu, đăng xuất làm token hết hiệu lực', t_doi_mk_dang_xuat)
# Bệnh nhân vừa đăng ký dùng cho các test đặt lịch, khám, hồ sơ: luôn chưa có lịch nên chạy lại nhiều lần được
T['bn2'] = dn(S['dk_email'], 'MatKhau456')
tc('XT14', N, 'Nhân viên mới phải đổi mật khẩu tạm trước khi dùng chức năng', lambda: (lambda tok: loi(*goi(tok, '/le-tan/lich-hen'), 403))(dn('hoa.pt@vietbac.vn')))

# ===================== 2. Dat lich (benh nhan) =====================
N = '2. Đặt lịch khám (bệnh nhân)'


def t_tim_khung():
    s, ds = goi(T['bn2'], '/dat-lich/ngay-trong?ma_ck=1')
    ngay = [x for x in ds if x.get('SoKhung', 0) > 0 and x['Ngay'] > str(NGAY)]
    if not ngay:
        return False, f'không có ngày trống: {ds[:2]}'
    S['ngay_dat'] = ngay[0]['Ngay']
    S['kg'], S['kg_bs'], dung = [], {}, set()
    for n in ngay[:8]:
        s, kg = goi(T['bn2'], f"/dat-lich/khung-gio?ngay={n['Ngay']}&ma_ck=1")
        for k in kg[2:3]:
            if (k['MaBS'], n['Ngay']) not in dung:
                dung.add((k['MaBS'], n['Ngay']))
                S['kg'].append(k['MaKG'])
                S['kg_bs'][k['MaKG']] = (k['MaBS'], n['Ngay'])
    return len(S['kg']) >= 7, f"{len(ngay)} ngày trống; lấy {len(S['kg'])} khung ở {len(S['kg'])} ngày khác nhau"


tc('DL01', N, 'Xem bác sĩ, ngày còn trống, khung giờ theo chuyên khoa', t_tim_khung)


def t_dat():
    s, d = goi(T['bn2'], '/lich-hen', 'POST', {'ma_kg': S['kg'][0], 'ly_do': 'Đau đầu kéo dài', 'trieu_chung': 'Chóng mặt'})
    S['lk_bn2'] = (d or {}).get('ma_lk')
    s2, ds = goi(T['bn2'], '/lich-hen/cua-toi')
    lh = next((x for x in ds if x['MaLK'] == S['lk_bn2']), None)
    return s == 200 and lh and lh['TrangThai'] == 'CHO_XAC_NHAN', f"{s} → {lh and lh['TrangThai']}"


tc('DL02', N, 'Đặt lịch → trạng thái Chờ xác nhận, hiện trong Lịch hẹn của tôi', t_dat)
tc('DL03', N, 'Người khác đặt trùng khung giờ bị chặn', lambda: loi(*goi(T['bn3'], '/lich-hen', 'POST', {'ma_kg': S['kg'][0]})))


def t_br03():
    r = [goi(T['bn2'], '/lich-hen', 'POST', {'ma_kg': k}) for k in S['kg'][1:3]]
    S['lk_bn2_them'] = [x[1].get('ma_lk') for x in r]
    s, d = goi(T['bn2'], '/lich-hen', 'POST', {'ma_kg': S['kg'][3]})
    ok, gc = loi(s, d, 400, '3')
    return ok and [x[0] for x in r] == [200, 200], f'2 lịch thêm {[x[0] for x in r]}; lịch thứ 4: {gc}'


tc('DL04', N, 'Tối đa 3 lịch chưa hoàn thành (BR03)', t_br03)


def t_doi():
    S['lk_bn2_ds'] = S['lk_bn2_them']
    s, d = goi(T['bn2'], f"/lich-hen/{S['lk_bn2_ds'][-1]}/doi", 'POST', {'ma_kg': S['kg'][4]})
    return s == 200, f'{s} {d}'


tc('DL05', N, 'Đổi lịch sang khung giờ khác', t_doi)


def t_huy():
    s, d = goi(T['bn2'], f"/lich-hen/{S['lk_bn2_ds'][-1]}/huy", 'POST', {'ly_do': 'Bận việc đột xuất'})
    return s == 200, f'{s} {d}'


tc('DL06', N, 'Hủy lịch (khi chưa duyệt / trong 15 phút)', t_huy)


def t_cho():
    s, d = goi(T['bn3'], '/danh-sach-cho', 'POST', {'ma_ck': 1, 'ngay': S['ngay_dat'], 'buoi': 'SANG', 'ly_do': 'Muốn khám sớm'})
    s2, ds = goi(T['bn3'], '/danh-sach-cho')
    return s == 200 and len(ds) >= 1, f'{s} {d}; danh sách {len(ds or [])}'


tc('DL07', N, 'Không cho vào danh sách chờ khi ngày còn khung trống (UC6.8)', lambda: loi(*goi(T['bn3'], '/danh-sach-cho', 'POST',
    {'ma_ck': 1, 'ngay': S['ngay_dat'], 'buoi': 'CA_NGAY'}), 400, 'còn khung'))

# ===================== 3. Le tan =====================
N = '3. Lễ tân: lịch hẹn, tiếp đón'


def t_duyet():
    s, d = goi(T['letan'], f"/le-tan/lich-hen/{S['lk_bn2']}/duyet", 'POST')
    return s == 200, f'{s} {d}'


tc('LT01', N, 'Danh sách chờ duyệt và đếm trên menu', lambda: (lambda a, b: (a[0] == 200 and b[0] == 200, f"{len(a[1])} lịch chờ, menu {b[1]}"))(
    goi(T['letan'], '/le-tan/lich-hen?trang_thai=CHO_XAC_NHAN'), goi(T['letan'], '/le-tan/cho-xac-nhan')))
tc('LT02', N, 'Duyệt lịch hẹn', t_duyet)
tc('LT03', N, 'Từ chối lịch phải có lý do', lambda: loi(*goi(T['letan'], f"/le-tan/lich-hen/{S['lk_bn2_ds'][0]}/huy", 'POST', {'ly_do': ''})))


def t_bn_moi():
    sdt = '08' + str(uuid.uuid4().int)[:8]
    s, d = goi(T['letan'], '/le-tan/benh-nhan', 'POST', {'ho_ten': 'Trần Văn Vãng Lai', 'ngay_sinh': '1970-03-03', 'gioi_tinh': 'NAM',
                                                        'sdt': sdt, 'dia_chi': 'Đà Nẵng'})
    S['bn_moi'] = (d or {}).get('ma_bn')
    s2, ds = goi(T['letan'], f'/le-tan/benh-nhan?sdt={sdt}')
    return s == 200 and ds and ds[0]['MaBN'] == S['bn_moi'], f'{s} {d}; tìm thấy {len(ds or [])}'


tc('LT04', N, 'Tạo hồ sơ bệnh nhân chưa có tài khoản, tìm theo SĐT', lambda: (lambda tok: t_bn_moi())(None) if True else None)


def t_dat_ho():
    s, d = goi(T['letan'], '/le-tan/lich-hen', 'POST', {'ma_bn': S['bn_moi'], 'ma_kg': S['kg'][6], 'kenh': 'DIEN_THOAI', 'ly_do': 'Gọi điện đặt'})
    S['lk_dat_ho'] = (d or {}).get('ma_lk')
    s2, ds = goi(T['letan'], f"/le-tan/lich-hen?ngay={S['kg_bs'][S['kg'][6]][1]}")
    lh = next((x for x in ds if x['MaLK'] == S['lk_dat_ho']), {})
    return s == 200 and lh.get('TrangThai') == 'DA_XAC_NHAN', f"{s} → {lh.get('TrangThai')}"


tc('LT05', N, 'Đặt lịch hộ qua điện thoại → xác nhận ngay (BR23)', t_dat_ho)


def t_vang_lai():
    """Lễ tân xếp bệnh nhân vừa đăng ký vào khung giờ còn trống hôm nay (UC7.7), dùng cho phần khám bên dưới."""
    s, kg = goi(T['letan'], f'/dat-lich/khung-gio?ngay={NGAY}&ma_ck=1&vang_lai=true')
    if not kg:
        return False, 'hôm nay không còn khung giờ chưa bắt đầu (chạy test trong giờ làm việc)'
    s, ds = goi(T['letan'], f"/le-tan/benh-nhan?sdt={S['dk_sdt']}")
    s, d = goi(T['letan'], '/le-tan/lich-hen', 'POST', {'ma_bn': ds[0]['MaBN'], 'ma_kg': kg[0]['MaKG'], 'kenh': 'TAI_QUAY',
                                                       'ly_do': 'Khám vãng lai (kiểm thử)', 'trieu_chung': 'Mệt, khát nhiều'})
    S['lk_kham'], S['bs_kham'] = (d or {}).get('ma_lk'), kg[0]['MaBS']
    return s == 200, f"{s} → lượt {S['lk_kham']}, {kg[0]['GioBatDau']} với {kg[0].get('BacSi')}"


tc('LT06', N, 'Xếp bệnh nhân vãng lai vào khung giờ hôm nay', t_vang_lai)


def t_checkin():
    s, d = goi(T['letan'], f"/le-tan/lich-hen/{S['lk_kham']}/check-in", 'POST', {})
    return s == 200 and d.get('so_thu_tu'), f"STT {d.get('so_thu_tu')}, BHYT {d.get('TrangThaiBHYT')}"


tc('LT06b', N, 'Check-in, cấp số thứ tự, vào hàng chờ bác sĩ', t_checkin)
tc('LT07', N, 'Check-in lại lần hai bị chặn', lambda: loi(*goi(T['letan'], f"/le-tan/lich-hen/{S['lk_kham']}/check-in", 'POST', {})))
tc('LT08', N, 'Check-in lịch ngày khác bị chặn', lambda: loi(*goi(T['letan'], f"/le-tan/lich-hen/{S['lk_dat_ho']}/check-in", 'POST', {})))

# ===================== 4. Kham benh =====================
N = '4. Bác sĩ khám bệnh'
BS = lambda: T['bs'] if S.get('bs_kham') in (None, 4) else dn({5: 'nam.nh@vietbac.vn', 6: 'mai.nt@vietbac.vn', 7: 'thanh.dv@vietbac.vn',
                                                                8: 'hong.vt@vietbac.vn', 9: 'bao.lq@vietbac.vn'}[S['bs_kham']])


def t_hang_cho():
    T['bsk'] = BS()
    s, ds = goi(T['bsk'], '/kham/hang-cho')
    return s == 200 and any(x['MaLK'] == S['lk_kham'] for x in ds), f'{len(ds)} người trong hàng chờ'


tc('KB01', N, 'Hàng chờ hôm nay có bệnh nhân vừa check-in', t_hang_cho)
tc('KB02', N, 'Bác sĩ khác không mở được lượt khám', lambda: loi(*goi(dn('mai.nt@vietbac.vn') if S.get('bs_kham') != 6 else T['bs'], f"/kham/{S['lk_kham']}"), 403))
tc('KB03', N, 'Gọi bệnh nhân vào khám', lambda: (lambda r: (r[0] == 200, f'{r[0]} {r[1]}'))(goi(T['bsk'], f"/kham/{S['lk_kham']}/goi", 'POST')))
tc('KB04', N, 'Huyết áp sai định dạng bị chặn', lambda: loi(*goi(T['bsk'], f"/kham/{S['lk_kham']}/ho-so", 'PUT', {'huyet_ap': '120-80'})))


def t_luu_ho_so():
    s, thuoc = goi(T['bsk'], '/kham/danh-muc/thuoc')
    # Đái tháo đường týp 2: thuốc đầu tay là Metformin
    thuoc = [t for t in thuoc if 'metformin' in (t['HoatChat'] or '').lower()] or thuoc
    s, d = goi(T['bsk'], f"/kham/{S['lk_kham']}/ho-so", 'PUT', {
        'mach': 82, 'huyet_ap': '130/85', 'nhiet_do': 37.2, 'can_nang': 60, 'chieu_cao': 160, 'trieu_chung': 'Mệt, khát nhiều',
        'kham_lam_sang': 'Tỉnh, tiếp xúc tốt', 'ma_icd': 'E11.9', 'chan_doan': 'Theo dõi đái tháo đường týp 2', 'loi_dan': 'Hạn chế đồ ngọt',
        'don_thuoc': [{'ma_thuoc': thuoc[0]['MaThuoc'], 'so_luong': 60, 'lieu_dung': '1 viên x 2 lần/ngày', 'cach_dung': 'Uống ngay sau ăn sáng, tối',
                       'so_ngay_dung': 30}]})
    return s == 200, f'{s} {d}'


tc('KB05', N, 'Lưu tạm hồ sơ, chẩn đoán ICD, kê đơn', t_luu_ho_so)


def t_chi_dinh():
    s, d = goi(T['bsk'], f"/kham/{S['lk_kham']}/chi-dinh", 'POST', {'ma_dv': [7, 6, 9, 11], 'yeu_cau': 'Làm theo thứ tự'})
    S['pcd'] = (d or {}).get('ma_pcd', [])
    return s == 200 and len(S['pcd']) == 4, f'{s} {d}'


tc('KB06', N, 'Chỉ định 4 dịch vụ CLS (XN, X-quang, nội soi)', t_chi_dinh)
tc('KB07', N, 'Hoàn tất bị chặn khi còn phiếu CLS chưa có kết quả', lambda: loi(*goi(T['bsk'], f"/kham/{S['lk_kham']}/hoan-tat", 'POST')))

# ===================== 5. Thu tam thu =====================
N = '5. Thu tạm thu CLS'


def t_cho_thu():
    s, ds = goi(T['letan'], '/thu-ngan/tam-thu')
    l = next((x for x in ds if x['MaLK'] == S['lk_kham']), None)
    S['phai_thu'] = l and l['SoTienPhaiThu']
    return bool(l) and l['SoPhieu'] >= 1, f"{l and l['SoPhieu']} phiếu, phải thu {S['phai_thu']}"


tc('TT01', N, 'Lượt khám xuất hiện trong danh sách chờ thu', t_cho_thu)
tc('TT02', N, 'Tiền khách đưa thiếu bị chặn', lambda: loi(*goi(T['letan'], '/thu-ngan/tam-thu', 'POST', {
    'ma_lk': S['lk_kham'], 'ma_pcd': S['pcd'], 'hinh_thuc': 'TIEN_MAT', 'tien_khach_dua': 1000})))


def t_thu():
    s, ds = goi(T['letan'], '/thu-ngan/tam-thu')
    l = next(x for x in ds if x['MaLK'] == S['lk_kham'])
    s, bl = goi(T['letan'], '/thu-ngan/tam-thu', 'POST', {'ma_lk': S['lk_kham'], 'ma_pcd': [p['MaPCD'] for p in l['Phieu']],
                                                          'hinh_thuc': 'CHUYEN_KHOAN'})
    S['bl'] = (bl or {}).get('MaBL')
    return s == 200 and bl['MaSoBienLai'].startswith('BL'), f"{s} biên lai {bl.get('MaSoBienLai')} {bl.get('TongTien')}"


tc('TT03', N, 'Thu chuyển khoản → lập biên lai', t_thu)
tc('TT04', N, 'Thu lại phiếu đã thu bị chặn', lambda: loi(*goi(T['letan'], '/thu-ngan/tam-thu', 'POST', {
    'ma_lk': S['lk_kham'], 'ma_pcd': S['pcd'], 'hinh_thuc': 'CHUYEN_KHOAN'})))
tc('TT05', N, 'Biên lai trong ngày và chi tiết để in', lambda: (lambda a, b: (a[0] == 200 and b[0] == 200 and b[1]['Phieu'], f"{len(a[1])} biên lai; chi tiết {len(b[1]['Phieu'])} phiếu"))(
    goi(T['letan'], '/thu-ngan/bien-lai'), goi(T['letan'], f"/thu-ngan/bien-lai/{S['bl']}")))

# ===================== 6. Can lam sang =====================
N = '6. Cận lâm sàng'
PCD = lambda ma_dv: S['pcd'][[7, 6, 9, 11].index(ma_dv)]
tc('CLS01', N, 'Hàng chờ phòng xét nghiệm có 2 phiếu vừa thu', lambda: (lambda r: (sum(1 for p in r[1]['DangCho'] if p['MaLK'] == S['lk_kham']) == 2, f"phòng {r[1]['Phong']['MaSoPhong']}: {len(r[1]['DangCho'])} phiếu"))(goi(T['xn'], '/cls/hang-cho')))
tc('CLS02', N, 'Nội soi bị chặn khi chưa làm đường huyết (BR18)', lambda: loi(*goi(T['ns'], f'/cls/phieu/{PCD(11)}/bat-dau', 'POST'), 400, 'trước'))
tc('CLS03', N, 'Phòng khác không mở được phiếu (BR11)', lambda: loi(*goi(T['xn'], f'/cls/phieu/{PCD(9)}'), 403))


def t_xn():
    r = []
    for dv, cs in [(7, [{'ma_chi_so': 6, 'gia_tri': 7.4}]), (6, [{'ma_chi_so': i, 'gia_tri': v} for i, v in [(1, 11.2), (2, 4.6), (3, 135), (4, 260), (5, 72)]])]:
        r.append(goi(T['xn'], f'/cls/phieu/{PCD(dv)}/bat-dau', 'POST')[0])
        r.append(goi(T['xn'], f'/cls/phieu/{PCD(dv)}/ket-qua', 'POST', {'chi_so': cs, 'nhan_xet': 'Kiểm thử'})[0])
    return r == [200] * 4, f'{r}'


tc('CLS04', N, 'Xét nghiệm: bắt đầu và trả kết quả chỉ số', t_xn)
tc('CLS05', N, 'Thiếu kết luận CĐHA bị chặn', lambda: (goi(T['cdha'], f'/cls/phieu/{PCD(9)}/bat-dau', 'POST'),
                                                        loi(*goi(T['cdha'], f'/cls/phieu/{PCD(9)}/ket-qua', 'POST', {'mo_ta': 'Phim'})))[1])


def t_xq():
    s, d = goi(T['cdha'], f'/cls/phieu/{PCD(9)}/ket-qua', 'POST', {'mo_ta': 'Hai phế trường sáng', 'ket_luan': 'Chưa thấy bất thường'})
    s2, t = goi(T['cdha'], f'/cls/phieu/{PCD(9)}/tep', 'POST', tep={'tep': ('phim.png', png(), 'image/png')})
    s3, _ = goi(T['cdha'], f'/cls/phieu/{PCD(9)}/tep', 'POST', tep={'tep': ('gia.png', b'khong phai anh', 'image/png')})
    return s == 200 and s2 == 200 and s3 == 400, f'kết quả {s}, ảnh {s2}, tệp giả {s3}'


tc('CLS06', N, 'X-quang: trả kết quả, đính kèm ảnh, chặn tệp giả', t_xq)


def t_ns():
    a = goi(T['ns'], f'/cls/phieu/{PCD(11)}/bat-dau', 'POST')[0]
    b = loi(*goi(T['ns'], f'/cls/phieu/{PCD(11)}/ket-qua', 'POST', {'ket_luan': 'Viêm dạ dày', 'da_nhin_an': True, 'da_ky_dong_y': False}), 400, 'cam kết')
    c = goi(T['ns'], f'/cls/phieu/{PCD(11)}/ket-qua', 'POST', {'mo_ta': 'Hang vị xung huyết', 'ket_luan': 'Viêm dạ dày', 'da_nhin_an': True,
                                                            'da_ky_dong_y': True, 'co_sinh_thiet': True, 'so_mau_sinh_thiet': 2, 'vi_tri_sinh_thiet': 'Hang vị'})[0]
    return a == 200 and b[0] and c == 200, f'bắt đầu {a}; thiếu cam kết: {b[1]}; trả {c}'


tc('CLS07', N, 'Nội soi: bắt buộc cam kết, ghi sinh thiết', t_ns)
tc('CLS08', N, 'Đủ kết quả → lượt khám về hàng chờ bác sĩ (Đã có kết quả)', lambda: (lambda r: (r[1]['TrangThai'] == 'DA_CO_KET_QUA', r[1]['TrangThai']))(goi(T['bsk'], f"/kham/{S['lk_kham']}")))


def t_dieu_chinh():
    s, d = goi(T['xn'], f'/cls/phieu/{PCD(7)}/ket-qua', 'PUT', {'chi_so': [{'ma_chi_so': 6, 'gia_tri': 7.1}], 'nhan_xet': 'Sửa', 'ly_do_dieu_chinh': 'Nhập nhầm'})
    s2, ct = goi(T['xn'], f'/cls/phieu/{PCD(7)}')
    return s == 200 and ct['KetQua']['PhienBan'] == 2 and len(ct['KetQua']['LichSu']) == 1, f"{s}, bản {ct['KetQua']['PhienBan']}"


tc('CLS09', N, 'Điều chỉnh kết quả lưu bản cũ (UC14.7)', t_dieu_chinh)

# ===================== 4b. Hoan tat kham =====================
N = '4. Bác sĩ khám bệnh'


def t_hoan_tat():
    a = goi(T['bsk'], f"/kham/{S['lk_kham']}/goi", 'POST')[0]
    b, d = goi(T['bsk'], f"/kham/{S['lk_kham']}/hoan-tat", 'POST')
    return a == 200 and b == 200, f'gọi lại {a}, hoàn tất {b} {d}'


tc('KB08', N, 'Gọi lại đọc kết quả rồi hoàn tất khám', t_hoan_tat)
tc('KB09', N, 'Sửa hồ sơ sau khi hoàn tất bị chặn (BR06)', lambda: loi(*goi(T['bsk'], f"/kham/{S['lk_kham']}/ho-so", 'PUT', {'chan_doan': 'Sửa'})))
tc('KB10', N, 'Bổ sung ghi chú sau hoàn tất', lambda: (lambda r: (r[0] == 200, f'{r[0]}'))(goi(T['bsk'], f"/kham/{S['lk_kham']}/ghi-chu", 'POST', {'noi_dung': 'Hẹn xét nghiệm lại sau 3 tháng'})))
tc('KB11', N, 'Kết quả CLS không sửa được sau khi hoàn tất', lambda: loi(*goi(T['xn'], f'/cls/phieu/{PCD(7)}/ket-qua', 'PUT', {'chi_so': [{'ma_chi_so': 6, 'gia_tri': 6}], 'ly_do_dieu_chinh': 'x'})))


def t_ho_so_bn():
    s, d = goi(T['bsk'], f"/kham/{S['lk_kham']}")
    tk = None
    # Benh nhan cua luot kham dang nhap: tim tai khoan qua admin
    s2, ds = goi(T['admin'], f"/tai-khoan?tu_khoa={d['BenhNhan']['SDT']}")
    email = next((x['Email'] for x in ds if x.get('MaBN') == d['BenhNhan']['MaBN']), None)
    if not email:
        return True, 'bệnh nhân không có tài khoản (bỏ qua phần xem của bệnh nhân)'
    tok = T['bn2'] if email == S.get('dk_email') else dn(email)
    s3, hs = goi(tok, '/ho-so-suc-khoe')
    s4, ct = goi(tok, f"/ho-so-suc-khoe/{S['lk_kham']}")
    return s4 == 200 and any(p.get('Tep') for p in ct['ChiDinh']), f'{len(hs)} lần khám; chi tiết có ảnh: {any(p.get("Tep") for p in ct["ChiDinh"])}'


tc('KB12', N, 'Bệnh nhân xem hồ sơ sức khỏe có kết quả CLS và ảnh', t_ho_so_bn)

# ===================== 7. Lich lam viec =====================
N = '7. Lịch làm việc'
def ngay_ca_trong():
    tu, den = NGAY + datetime.timedelta(days=8), NGAY + datetime.timedelta(days=60)
    s, ca = goi(T['bs'], f'/lich-lam-viec/ca?tu_ngay={tu}&den_ngay={den}&ma_bs=4')
    da_co = {(str(c.get('NgayLam')), c.get('CaLam')) for c in ca}
    d = tu
    while d.weekday() == 6 or (str(d), 'CHIEU') in da_co:
        d += datetime.timedelta(days=1)
    return d


NGAY_CA = ngay_ca_trong()


def t_dang_ky_ca():
    s, d = goi(T['bs'], '/lich-lam-viec/dang-ky', 'POST', {'ngay': str(NGAY_CA), 'ca_lam': 'CHIEU', 'ghi_chu': 'Kiểm thử'})
    S['dk_ca'] = (d or {}).get('ma_dk')
    s2, ds = goi(T['admin'], '/lich-lam-viec/dang-ky?trang_thai=CHO_DUYET')
    S['dk_thay'] = any(x['MaDK'] == S['dk_ca'] for x in ds)
    return s == 200 and S['dk_thay'], f'{s} {d}; quản trị thấy trong danh sách chờ duyệt: {S["dk_thay"]}'


tc('LV01', N, 'Bác sĩ đăng ký ca, quản trị thấy chờ duyệt', t_dang_ky_ca)


def t_duyet_ca():
    s, phong = goi(T['admin'], f'/lich-lam-viec/phong?ma_bs=4&ngay={NGAY_CA}&ca_lam=CHIEU')
    trong = [p for p in phong if not p.get('BacSiDangDung')]
    s, d = goi(T['admin'], f"/lich-lam-viec/dang-ky/{S['dk_ca']}/duyet", 'POST', {'ma_phong': trong[0]['MaPhong'], 'thoi_luong': 15})
    s2, ca = goi(T['bs'], f'/lich-lam-viec/ca?tu_ngay={NGAY_CA}&den_ngay={NGAY_CA}')
    S['ca'] = next((c['MaCa'] for c in ca if c.get('CaLam') == 'CHIEU' and c.get('MaBS') == 4), None)
    return s == 200 and S['ca'], f'{s} {d}; ca {S["ca"]}'


tc('LV02', N, 'Duyệt đăng ký → tạo ca và khung giờ', t_duyet_ca)


def t_khoa():
    s, ct = goi(T['bs'], f"/lich-lam-viec/ca/{S['ca']}")
    kg = [k['MaKG'] for k in ct['KhungGio'][:2]]
    a = goi(T['bs'], '/lich-lam-viec/khung-gio/khoa', 'POST', {'ma_kg': kg, 'ly_do': 'Họp chuyên môn'})[0]
    b = goi(T['bs'], '/lich-lam-viec/khung-gio/mo', 'POST', {'ma_kg': kg})[0]
    return a == 200 and b == 200, f'khóa {a}, mở {b}'


tc('LV03', N, 'Bác sĩ khóa / mở khung giờ của mình', t_khoa)
tc('LV04', N, 'Hủy ca (bác sĩ nghỉ)', lambda: (lambda r: (r[0] == 200, f'{r[0]} {r[1]}'))(goi(T['admin'], f"/lich-lam-viec/ca/{S['ca']}/huy", 'POST', {'ly_do': 'Nghỉ phép'})))

# ===================== 8. Quan tri =====================
N = '8. Quản trị tài khoản, phân quyền, nhật ký'


def t_tao_nv():
    email = f'nv.{uuid.uuid4().hex[:6]}@vietbac.vn'
    s, d = goi(T['admin'], '/tai-khoan/nhan-vien', 'POST', {'ho_ten': 'Lê Kiểm Thử', 'email': email, 'sdt': '07' + str(uuid.uuid4().int)[:8],
                                                            'loai_nhan_vien': 'LE_TAN'})
    S['nv'] = email
    s2, ds = goi(T['admin'], f'/tai-khoan?tu_khoa={email}')
    S['nv_tk'] = ds[0]['MaTK'] if ds else None
    return s == 200 and d.get('mat_khau_tam'), f'{s}, có mật khẩu tạm: {bool(d.get("mat_khau_tam"))}'


tc('QT01', N, 'Tạo tài khoản nhân viên, cấp mật khẩu tạm', t_tao_nv)


def t_khoa_tk():
    a = goi(T['admin'], f"/tai-khoan/{S['nv_tk']}/khoa", 'POST', {'ly_do': 'Kiểm thử'})[0]
    s, d = goi(None, '/auth/dang-nhap', 'POST', {'dinh_danh': S['nv'], 'mat_khau': 'x'})
    b = goi(T['admin'], f"/tai-khoan/{S['nv_tk']}/mo-khoa", 'POST')[0]
    return a == 200 and b == 200, f'khóa {a}, mở {b}'


tc('QT02', N, 'Khóa / mở khóa tài khoản', t_khoa_tk)
tc('QT03', N, 'Cấp lại mật khẩu', lambda: (lambda r: (r[0] == 200 and r[1].get('mat_khau_tam'), f'{r[0]}'))(goi(T['admin'], f"/tai-khoan/{S['nv_tk']}/cap-lai-mat-khau", 'POST')))
tc('QT04', N, 'Xóa tài khoản chưa phát sinh dữ liệu', lambda: (lambda r: (r[0] == 200, f'{r[0]} {r[1]}'))(goi(T['admin'], f"/tai-khoan/{S['nv_tk']}", 'DELETE')))
tc('QT05', N, 'Không xóa được tài khoản đã có dữ liệu nghiệp vụ', lambda: loi(*goi(T['admin'], '/tai-khoan/4', 'DELETE')))
tc('QT06', N, 'Bảng phân quyền', lambda: (lambda r: (r[0] == 200, f'{r[0]}'))(goi(T['admin'], '/phan-quyen')))
tc('QT07', N, 'Nhật ký thao tác ghi các thao tác vừa test', lambda: (lambda r: (r[0] == 200 and any(x.get('HanhDong') == 'THU_TAM_THU' for x in r[1]), f'{len(r[1])} dòng'))(goi(T['admin'], f'/nhat-ky/thao-tac?tu_ngay={NGAY}')))
tc('QT08', N, 'Nhật ký truy cập hồ sơ bệnh án', lambda: (lambda r: (r[0] == 200 and len(r[1]) > 0, f'{len(r[1])} dòng'))(goi(T['admin'], f'/nhat-ky/truy-cap-ho-so?tu_ngay={NGAY}')))
tc('QT09', N, 'Quản trị xem lịch hẹn / lịch khám ở chế độ giám sát', lambda: (lambda a, b: (a[0] == 200 and b[0] == 200, f'{len(a[1])} lịch hẹn, {len(b[1])} lịch khám'))(
    goi(T['admin'], f'/le-tan/lich-hen?ngay={NGAY}'), goi(T['admin'], f'/bac-si/lich-kham?ngay={NGAY}&ma_bs=4')))
tc('QT10', N, 'Quản trị không thao tác thay lễ tân (duyệt lịch)', lambda: loi(*goi(T['admin'], f"/le-tan/lich-hen/{S['lk_bn2']}/duyet", 'POST'), 403))

# ===================== 9. Danh muc, mat bang =====================
N = '9. Danh mục và sơ đồ mặt bằng'


def t_ck():
    ten = 'Mắt ' + uuid.uuid4().hex[:4]
    s, d = goi(T['admin'], '/quan-ly/chuyen-khoa', 'POST', {'ten_ck': ten, 'mo_ta': 'Khám mắt', 'phi_kham': 160000})
    ma = (d or {}).get('ma_ck') or (d or {}).get('MaCK')
    s2, ds = goi(T['admin'], '/quan-ly/chuyen-khoa')
    ma = ma or next((x['MaCK'] for x in ds if x['TenCK'] == ten), None)
    s3 = goi(T['admin'], f'/quan-ly/chuyen-khoa/{ma}/trang-thai', 'POST', {'hoat_dong': False})[0]
    # Xóa luôn để danh mục không tích chuyên khoa "Mắt ..." sau mỗi lần chạy
    s4 = goi(T['admin'], f'/quan-ly/chuyen-khoa/{ma}', 'DELETE')[0]
    s5, ds = goi(T['admin'], '/quan-ly/chuyen-khoa')
    con = any(x['TenCK'] == ten for x in ds)
    return s == 200 and s3 == 200 and s4 == 200 and not con, f'thêm {s}, ngừng {s3}, xóa {s4}, còn trong danh sách: {con}'


tc('DM01', N, 'Thêm / ngừng / xóa chuyên khoa chưa dùng', t_ck)
tc('DM01b', N, 'Không xóa được chuyên khoa đã có bác sĩ, lịch hẹn', lambda: loi(*goi(T['admin'], '/quan-ly/chuyen-khoa/1', 'DELETE'), 400, 'ngừng'))
tc('DM02', N, 'Phí khám âm bị chặn', lambda: loi(*goi(T['admin'], '/quan-ly/chuyen-khoa', 'POST', {'ten_ck': 'Âm', 'phi_kham': -1})))
def t_thuoc():
    s, d = goi(T['admin'], '/quan-ly/thuoc', 'POST', {'ten_thuoc': 'Thuốc kiểm thử ' + uuid.uuid4().hex[:3], 'hoat_chat': 'Paracetamol',
                                                     'ham_luong': '500mg', 'don_vi_tinh': 'Viên', 'don_gia': 1200})
    # Xóa ngay để danh mục thuốc của bác sĩ không tích thuốc giả sau mỗi lần chạy
    s2 = goi(T['admin'], f"/quan-ly/thuoc/{(d or {}).get('ma_thuoc')}", 'DELETE')[0]
    s3, d3 = goi(T['admin'], '/quan-ly/thuoc/1', 'DELETE')
    return s == 200 and s2 == 200 and s3 == 400, f'thêm {s} {d}, xóa {s2}; xóa thuốc đã kê: {s3} {(d3 or {}).get("detail")}'


tc('DM03', N, 'Thêm / xóa thuốc chưa kê; thuốc đã kê không xóa được', t_thuoc)
tc('DM04', N, 'Giá BHYT lớn hơn giá thuốc bị chặn', lambda: loi(*goi(T['admin'], '/quan-ly/thuoc', 'POST', {
    'ten_thuoc': 'Sai giá', 'don_vi_tinh': 'Viên', 'don_gia': 1000, 'gia_bhyt': 2000})))
def t_icd():
    # U99.x: nhóm U dành cho mã tạm, không trùng mã bệnh thật
    ma = 'U99.' + str(uuid.uuid4().int)[:2]
    s, d = goi(T['admin'], '/quan-ly/icd', 'POST', {'ma_icd': ma, 'ten_benh': 'Mã kiểm thử'})
    s2 = goi(T['admin'], f'/quan-ly/icd/{ma}', 'DELETE')[0]
    s3 = goi(T['admin'], '/quan-ly/icd/I10', 'DELETE')[0]
    return s == 200 and s2 == 200 and s3 == 400, f'thêm {ma} {s}, xóa {s2}; xóa I10 đã dùng: {s3}'


tc('DM05', N, 'Thêm / xóa mã ICD chưa dùng; mã đã dùng không xóa được', t_icd)
tc('DM06', N, 'Xem dịch vụ, mẫu chỉ số', lambda: (lambda a, b: (a[0] == 200 and b[0] == 200 and len(b[1]) > 0, f'{len(a[1])} dịch vụ, CBC {len(b[1])} chỉ số'))(
    goi(T['admin'], '/quan-ly/dich-vu'), goi(T['admin'], '/quan-ly/dich-vu/6/chi-so')))
tc('DM07', N, 'Chỉ đường từ sảnh tới phòng nội soi (tầng 2)', lambda: (lambda r: (r[0] == 200 and r[1], json.dumps(r[1], ensure_ascii=False)[:90]))(goi(T['admin'], '/quan-ly/mat-bang/chi-duong?tu=1&den=20')))
tc('DM08', N, 'Thông tin phòng khám', lambda: (lambda r: (r[0] == 200 and r[1].get('TenPhongKham'), r[1].get('TenPhongKham')))(goi(T['admin'], '/quan-ly/thong-tin')))

# ===================== 10. Ho so ca nhan, thong bao =====================
N = '10. Hồ sơ cá nhân, thông báo'
tc('HS01', N, 'Xem và cập nhật hồ sơ cá nhân', lambda: (lambda a: (lambda b: (a[0] == 200 and b[0] == 200, f'{b[0]}'))(goi(T['bn2'], '/ho-so', 'PUT', {'ho_ten': a[1]['HoTen'], 'ngay_sinh': a[1]['NgaySinh'], 'gioi_tinh': a[1]['GioiTinh'], 'cccd': a[1].get('CCCD'), 'dia_chi': '12 Lê Lợi, Đà Nẵng'})))(goi(T['bn2'], '/ho-so')))
tc('HS02', N, 'Đổi ảnh đại diện', lambda: (lambda r: (r[0] == 200, f'{r[0]}'))(goi(T['bn2'], '/ho-so/anh-dai-dien', 'POST', tep={'anh': ('a.png', png(), 'image/png')})))
tc('HS03', N, 'Thông báo của bệnh nhân sau khi lịch được duyệt', lambda: (lambda r: (r[0] == 200 and r[1]['ds'], f"{len(r[1]['ds'])} thông báo, {r[1]['chua_doc']} chưa đọc"))(goi(T['bn2'], '/thong-bao')))
tc('HS04', N, 'Đánh dấu đọc hết', lambda: (lambda a: (lambda b: (a[0] == 200 and b[1]['chua_doc'] == 0, f"còn {b[1]['chua_doc']}"))(goi(T['bn2'], '/thong-bao')))(goi(T['bn2'], '/thong-bao/doc-het', 'POST')))

# ===================== 11. Danh gia sau kham, gop y - khieu nai =====================
N = '11. Đánh giá, góp ý'
LK = lambda: S['lk_kham']
if not any(k['ma'] == 'KB08' and k['dat'] for k in KQ):
    # Ngoai gio lam viec (khong kham duoc luot moi): dung luot da hoan tat, chua thanh toan cua benh nhan kiem thu lan truoc
    _, _ds = goi(T['letan'], '/thanh-toan/hoa-don?trang_thai=CHUA_THANH_TOAN')
    for _h in _ds or []:
        _tok = dn(f"kiemthu.{_h['SDT']}@gmail.com", 'MatKhau456')
        if _tok:
            S['lk_kham'], T['bn2'] = _h['MaLK'], _tok
            print(f"(Dùng lượt {_h['MaLK']} của kiemthu.{_h['SDT']} cho phần đánh giá)")
            break
DIEM = {'DiemThoiGianCho': '2', 'DiemThaiDoNhanVien': '5', 'DiemChiPhi': '4'}


def t_chua_tra():
    s, d = goi(T['bn2'], f'/danh-gia/luot/{LK()}')
    return s == 200 and d['LyDoKhongDuoc'] and 'thanh toán' in d['LyDoKhongDuoc'], f"{s} {d.get('LyDoKhongDuoc')}"


def t_thu_hoa_don():
    s, ds = goi(T['bn2'], '/thanh-toan/cua-toi')
    hd = next((h for h in ds if h['MaLK'] == LK()), None)
    if not hd:
        return False, 'không thấy hóa đơn của lượt khám'
    s1, _ = goi(T['letan'], f"/thanh-toan/hoa-don/{hd['MaHD']}/thu", 'POST', {'hinh_thuc': 'CHUYEN_KHOAN'})
    s2, d = goi(T['bn2'], '/danh-gia/cua-toi')
    co = any(x['MaLK'] == LK() for x in d['ChoDanhGia'])
    return s1 == 200 and co, f"thu {s1}; {len(d['ChoDanhGia'])} lượt chờ đánh giá"


def t_gui_danh_gia():
    s, d = goi(T['bn2'], f'/danh-gia/luot/{LK()}', 'POST', tep={
        'diem_bac_si': '5', 'nhan_xet_bac_si': 'Bác sĩ khám kỹ, tư vấn rõ ràng, rất tận tình',
        'nhan_xet_dich_vu': 'Phải chờ lâu ở quầy tiếp đón nhưng nhân viên vui vẻ', **DIEM,
        'anh': ('a.png', png(), 'image/png')})
    s2, m = goi(T['bn2'], f'/danh-gia/luot/{LK()}')
    dg = (m or {}).get('DanhGia') or {}
    return s == 200 and dg.get('DiemBacSi') == 5 and len(dg.get('Anh', [])) == 1 and dg.get('DiemDichVuCLS') is None, \
        f"{s} → MaDG {(d or {}).get('ma_dg')}, {len(dg.get('Anh', []))} ảnh, CLS bỏ qua"


def t_phan_tich():
    s, d = goi(T['admin'], '/danh-gia/phan-tich', 'POST')
    s2, ds = goi(T['admin'], f'/danh-gia?tu_ngay={NGAY}&den_ngay={NGAY}')
    dg = next((x for x in ds if x['MaLK'] == LK()), {})
    return s == 200 and dg.get('CamXuc') and dg.get('ChuDe'), f"phân tích {d.get('so_luong')}; {dg.get('CamXuc')} {dg.get('ChuDe')} {dg.get('MucDoNghiemTrong')}"


def t_bao_cao():
    s, d = goi(T['admin'], f'/danh-gia/bao-cao?tu_ngay={NGAY.replace(day=1) - datetime.timedelta(days=90)}&den_ngay={NGAY}')
    t = d['TongQuan']
    return s == 200 and t['SoDanhGia'] > 0 and 'TongHop' in d, \
        f"{t['SoDanhGia']} đánh giá, bác sĩ {t['DiemBacSi']}★, {len(d['ChuDe'])} chủ đề, tổng hợp: {d['TongHop'].get('CoTongHop')}"


tc('DG01', N, 'Lượt chưa thanh toán chưa đánh giá được (BR24)', t_chua_tra)
tc('DG02', N, 'Thanh toán xong → lượt vào danh sách chờ đánh giá', t_thu_hoa_don)
tc('DG03', N, 'Thiếu điểm bác sĩ bị chặn', lambda: loi(*goi(T['bn2'], f'/danh-gia/luot/{LK()}', 'POST', tep=dict(DIEM)), 400, 'bác sĩ'))
# DG04 (bắt chấm ít nhất một tiêu chí dịch vụ) đã bỏ: tiêu chí dịch vụ giờ không bắt buộc
tc('DG05', N, 'Điểm ngoài 1–5 bị chặn', lambda: loi(*goi(T['bn2'], f'/danh-gia/luot/{LK()}', 'POST', tep={'diem_bac_si': '6', **DIEM}), 400, '1 đến 5'))
tc('DG06', N, 'Gửi đánh giá kèm ảnh, bỏ qua tiêu chí CLS', t_gui_danh_gia)
tc('DG07', N, 'Đánh giá lần hai bị chặn', lambda: loi(*goi(T['bn2'], f'/danh-gia/luot/{LK()}', 'POST', tep={'diem_bac_si': '3', **DIEM}), 400, 'đã được đánh giá'))
tc('DG08', N, 'Bệnh nhân khác không mở được lượt khám', lambda: loi(*goi(T.get('bn') or dn('an.hv@gmail.com'), f'/danh-gia/luot/{LK()}'), 404))
tc('DG09', N, 'Phân tích cảm xúc, chủ đề (UC15.8)', t_phan_tich)
tc('DG10', N, 'Báo cáo đánh giá (UC13.3)', t_bao_cao)
tc('DG11', N, 'Lễ tân không xem được báo cáo đánh giá', lambda: loi(*goi(T['letan'], f'/danh-gia/bao-cao?tu_ngay={NGAY}&den_ngay={NGAY}'), 403))


def t_gui_gop_y():
    s, d = goi(T['bn2'], '/gop-y', 'POST', tep={'loai': 'KHIEU_NAI', 'chu_de': 'Thời gian chờ', 'ma_lk': str(LK()),
                                                'noi_dung': 'Tôi phải chờ hơn 1 tiếng dù đã đặt lịch trước, nhân viên không giải thích.',
                                                'tep': ('anh.png', png(), 'image/png')})
    S['gy'] = (d or {}).get('ma_phieu')
    han = datetime.datetime.fromisoformat(d['han_phan_hoi']) if s == 200 else None
    gio = round((han - datetime.datetime.now()).total_seconds() / 3600) if han else None
    return s == 200 and d['ma_so_phieu'].startswith('GY') and gio == 48, f"{s} {d.get('ma_so_phieu')}, hạn sau {gio} giờ"


def t_ghi_chu_an():
    a = goi(T['admin'], f"/gop-y/{S['gy']}/ghi-chu", 'POST', {'noi_dung': 'Chuyển lễ tân kiểm tra ca sáng'})[0]
    s, p = goi(T['bn2'], f"/gop-y/cua-toi/{S['gy']}")
    s2, q = goi(T['admin'], f"/gop-y/{S['gy']}")
    return a == 200 and len(p['TraoDoi']) == 0 and len(q['TraoDoi']) == 1 and 'CamXuc' not in p, \
        f"bệnh nhân thấy {len(p['TraoDoi'])}, quản trị thấy {len(q['TraoDoi'])} trao đổi"


def t_phan_hoi():
    e = goi(T['admin'], f"/gop-y/{S['gy']}/phan-hoi", 'POST', {'noi_dung': '  '})[0]
    a = goi(T['admin'], f"/gop-y/{S['gy']}/tiep-nhan", 'POST')[0]
    b = goi(T['admin'], f"/gop-y/{S['gy']}/phan-hoi", 'POST', {'noi_dung': 'Phòng khám xin lỗi, đã bổ sung nhân sự ca sáng.'})[0]
    s, p = goi(T['bn2'], f"/gop-y/cua-toi/{S['gy']}")
    return e == 400 and a == 200 and b == 200 and p['TrangThai'] == 'DA_PHAN_HOI', f"trống {e}, tiếp nhận {a}, phản hồi {b} → {p['TrangThai']}"


def t_bo_sung_dong():
    a = goi(T['bn2'], f"/gop-y/cua-toi/{S['gy']}/bo-sung", 'POST', {'noi_dung': 'Mong phòng khám báo trước khi trễ giờ.'})[0]
    t1 = goi(T['bn2'], f"/gop-y/cua-toi/{S['gy']}")[1]['TrangThai']
    goi(T['admin'], f"/gop-y/{S['gy']}/phan-hoi", 'POST', {'noi_dung': 'Đã ghi nhận, sẽ nhắn tin khi bác sĩ trễ quá 15 phút.'})
    b = goi(T['bn2'], f"/gop-y/cua-toi/{S['gy']}/hai-long", 'POST')[0]
    t2 = goi(T['bn2'], f"/gop-y/cua-toi/{S['gy']}")[1]['TrangThai']
    return a == 200 and t1 == 'DANG_XU_LY' and b == 200 and t2 == 'DA_DONG', f"bổ sung → {t1}; hài lòng → {t2}"


tc('GY01', N, 'Góp ý nội dung trống bị chặn', lambda: loi(*goi(T['bn2'], '/gop-y', 'POST', tep={'loai': 'GOP_Y', 'chu_de': 'Khác', 'noi_dung': ' '}), 400, 'nội dung'))
tc('GY02', N, 'Gửi khiếu nại kèm lượt khám, ảnh; hạn phản hồi 48 giờ (BR25)', t_gui_gop_y)
tc('GY03', N, 'Gắn lượt khám của người khác bị chặn', lambda: loi(*goi(T['bn2'], '/gop-y', 'POST', tep={'loai': 'GOP_Y', 'chu_de': 'Khác', 'ma_lk': '1', 'noi_dung': 'x'}), 400, 'không thuộc'))
tc('GY04', N, 'Quản trị thấy phiếu mới, số chờ xử lý', lambda: (lambda a, b: (any(x['MaPhieu'] == S['gy'] for x in a[1]) and b[1]['so_luong'] > 0, f"{len(a[1])} phiếu cần xử lý, {b[1]['qua_han']} quá hạn"))(
    goi(T['admin'], '/gop-y?trang_thai=MOI&trang_thai=DANG_XU_LY'), goi(T['admin'], '/gop-y/so-cho')))
tc('GY05', N, 'Ghi chú nội bộ ẩn với bệnh nhân', t_ghi_chu_an)
tc('GY06', N, 'Phản hồi trống bị chặn; phản hồi → Đã phản hồi', t_phan_hoi)
tc('GY07', N, 'Bổ sung → Đang xử lý; xác nhận hài lòng → Đã đóng', t_bo_sung_dong)
tc('GY08', N, 'Bổ sung vào phiếu đã đóng bị chặn', lambda: loi(*goi(T['bn2'], f"/gop-y/cua-toi/{S['gy']}/bo-sung", 'POST', {'noi_dung': 'thêm'}), 400, 'đã đóng'))
tc('GY09', N, 'Bệnh nhân không vào được trang xử lý góp ý', lambda: loi(*goi(T['bn2'], '/gop-y'), 403))

json.dump(KQ, open('ket_qua.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"\nTONG: {sum(k['dat'] for k in KQ)}/{len(KQ)} dat")
