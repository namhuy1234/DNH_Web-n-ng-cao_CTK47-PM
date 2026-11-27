"""Kiểm thử CORS, rate limit, versioning, tài liệu API (Lab 5).
Chạy API với cấu hình mặc định (không đặt biến RateLimiting__*): dotnet run --project src/CulinaryBlog.API
Kết quả ghi vào docs/ket-qua-bao-mat.txt. Không tạo dữ liệu."""
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

HOST = 'http://localhost:5000'
FRONTEND = 'http://localhost:3000'
lines, failed, total = [], 0, 0
sys.stdout.reconfigure(encoding='utf-8')


def send(method, path, headers=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = dict(headers or {})
    if data:
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(HOST + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.headers, response.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read().decode('utf-8', 'replace')


def check(title, passed, detail):
    global failed, total
    total += 1
    failed += not passed
    lines.append(f"[{'DAT' if passed else 'SAI'}] {title:52} {detail}")


def section(name):
    lines.extend(['', f'== {name} =='])


section('CORS')
status, headers, _ = send('OPTIONS', '/api/v1/recipes', {
    'Origin': FRONTEND, 'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type'})
check('Preflight tu frontend duoc chap nhan', headers.get('Access-Control-Allow-Origin') == FRONTEND,
      f"{status} Allow-Origin={headers.get('Access-Control-Allow-Origin')}")
status, headers, _ = send('GET', '/api/v1/categories', {'Origin': 'http://trang-la.example'})
check('Origin la khong duoc cap header CORS', headers.get('Access-Control-Allow-Origin') is None,
      f"{status} Allow-Origin={headers.get('Access-Control-Allow-Origin')}")

section('Header bao mat')
status, headers, _ = send('GET', '/api/v1/categories')
check('X-Content-Type-Options, X-Frame-Options', headers.get('X-Content-Type-Options') == 'nosniff'
      and headers.get('X-Frame-Options') == 'DENY',
      f"{headers.get('X-Content-Type-Options')}, {headers.get('X-Frame-Options')}")
check('Khong lo header Server', headers.get('Server') is None, f"Server={headers.get('Server')}")

status, headers, _ = send('GET', '/api/v1/recipes/khong-ton-tai')
check('Phan hoi loi cung co header bao mat', status == 404 and headers.get('X-Content-Type-Options') == 'nosniff'
      and headers.get('X-Frame-Options') == 'DENY', f"{status} {headers.get('X-Content-Type-Options')}")
status, headers, _ = send('GET', '/api/v1/categories')

section('Versioning')
check('/api/v1 hoat dong va bao phien ban ho tro', status == 200 and headers.get('api-supported-versions') == '1.0',
      f"{status} api-supported-versions={headers.get('api-supported-versions')}")
status, _, _ = send('GET', '/api/v2/categories')
check('/api/v2 chua ton tai', status == 404, str(status))

section('Tai lieu API')
status, _, body = send('GET', '/openapi/v1.json')
document = json.loads(body) if status == 200 else {}
operations = [o for p in document.get('paths', {}).values() for o in p.values()]
check('/openapi/v1.json co 30 endpoint /api/v1', status == 200 and len(operations) == 30
      and all(p.startswith('/api/v1/') for p in document['paths']), f'{status}, {len(operations)} operation')
check('Moi endpoint co mo ta', bool(operations) and all(o.get('summary') for o in operations),
      f"{sum(1 for o in operations if o.get('summary'))}/{len(operations)}")
check('Khai bao bao mat Bearer', 'Bearer' in document.get('components', {}).get('securitySchemes', {}),
      f"{sum(1 for o in operations if o.get('security'))} endpoint can token")
status, _, body = send('GET', '/scalar/v1')
check('Giao dien Scalar /scalar/v1', status == 200 and '<html' in body.lower(), str(status))

section('Phan quyen')
status, _, _ = send('POST', '/api/v1/categories', body={'name': 'x'})
check('Ghi du lieu khi chua dang nhap', status == 401, str(status))
status, _, _ = send('GET', '/api/v1/auth/me', {'Authorization': 'Bearer token-gia'})
check('Token gia', status == 401, str(status))

section('Rate limiting (cau hinh mac dinh)')
# /auth: 10 request moi phut; da dung 1 o muc phan quyen.
codes = [send('POST', '/api/v1/auth/login', body={'email': 'khong@co.test', 'password': 'x'})[0] for _ in range(11)]
check('/auth: qua 10 request/phut thi 429', codes[:9] == [401] * 9 and codes[9:] == [429, 429], str(codes))
status, headers, body = send('POST', '/api/v1/auth/login', {'Origin': FRONTEND}, {'email': 'a@b.vn', 'password': 'x'})
check('429 co Retry-After va Problem Details', status == 429 and headers.get('Retry-After')
      and 'RATE_LIMIT_EXCEEDED' in body, f"Retry-After={headers.get('Retry-After')}")
check('429 van co header CORS', headers.get('Access-Control-Allow-Origin') == FRONTEND,
      str(headers.get('Access-Control-Allow-Origin')))
codes = [send('GET', '/api/v1/categories')[0] for _ in range(100)]
check('API chung: qua 100 request/phut thi 429', 429 in codes and codes[0] == 200,
      f'{codes.count(200)} lan 200, {codes.count(429)} lan 429')
codes = [send('GET', '/health/live')[0] for _ in range(30)]
check('Health check khong bi gioi han', set(codes) == {200}, f'{codes.count(200)}/30 lan 200')

header = [f'Kiem thu bao mat va tai lieu API - chay ngay {datetime.now():%d/%m/%Y %H:%M}',
          f'Dat {total - failed}/{total} truong hop']
out = Path(__file__).resolve().parent.parent / 'docs'
out.mkdir(exist_ok=True)
(out / 'ket-qua-bao-mat.txt').write_text('\n'.join(header + lines) + '\n', encoding='utf-8-sig')
print('\n'.join(header + lines))

sys.exit(1 if failed else 0)
