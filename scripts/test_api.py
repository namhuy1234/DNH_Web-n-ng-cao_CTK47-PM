"""Kiểm thử chức năng toàn bộ API. Bộ này gửi nhiều request nên phải nới giới hạn khi chạy API:
$env:RateLimiting__General=100000; $env:RateLimiting__Auth=100000; $env:RateLimiting__Upload=100000
dotnet run --project src/CulinaryBlog.API
Kết quả ghi vào docs/ket-qua-api.txt. Dữ liệu tạo ra được xóa sau khi chạy."""
import json
import shutil
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
HOST = 'http://localhost:5000'
API = HOST + '/api/v1'
STAMP = datetime.now().strftime('%H%M%S')
DOMAIN = f'kt{STAMP}.example.test'
CATEGORY = f'Kiem thu {STAMP}'
PASSWORD = 'KiemThu@123'
PNG = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) + b'0' * 64

lines, failed, total = [], 0, 0
sys.stdout.reconfigure(encoding='utf-8')


def send(method, url, body=None, token=None, headers=None, raw=None):
    headers = dict(headers or {})
    data = raw
    if body is not None:
        data = json.dumps(body).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(url if url.startswith('http') else API + url,
                                     data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status, content = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, content = error.code, error.read()
    try:
        return status, json.loads(content)
    except ValueError:
        return status, None


def check(title, expected, method, url, ok=None, **kwargs):
    """Gửi request, so mã trạng thái và (nếu có) điều kiện trên nội dung trả về."""
    global failed, total
    status, data = send(method, url, **kwargs)
    passed = status == expected and (ok is None or bool(ok(data)))
    total += 1
    failed += not passed
    note = ''
    if isinstance(data, dict) and status >= 400:
        note = f"  {data.get('type', '')}" if not str(data.get('type', '')).startswith('http') else ''
    lines.append(f"[{'DAT' if passed else 'SAI'}] {status} {method:6} {title}{note}")
    if not passed:
        lines.append(f'      mong doi {expected}, nhan: {json.dumps(data, ensure_ascii=False)[:300]}')
    return data or {}


def section(name):
    lines.extend(['', f'== {name} =='])


def multipart(content, content_type, fields=None):
    boundary = uuid.uuid4().hex
    parts = []
    for key, value in (fields or {}).items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="anh.png"\r\n'
                 f'Content-Type: {content_type}\r\n\r\n'.encode() + content + b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    return {'raw': b''.join(parts), 'headers': {'Content-Type': f'multipart/form-data; boundary={boundary}'}}


def sql(statement):
    result = subprocess.run(['docker', 'exec', '-i', 'culinary-postgres', 'psql', '-U', 'culinary', '-d',
                             'culinaryblog', '-qtA', '-v', 'ON_ERROR_STOP=1'],
                            input=statement, capture_output=True, text=True, encoding='utf-8', check=True)
    return result.stdout.strip()


def run():
    settings = json.loads((ROOT / 'src/CulinaryBlog.API/appsettings.Development.json').read_text('utf-8-sig'))
    section('Health checks')
    check('/health', 200, 'GET', HOST + '/health', ok=lambda d: d['status'] == 'Healthy')
    check('/health/live', 200, 'GET', HOST + '/health/live')
    check('/health/ready', 200, 'GET', HOST + '/health/ready', ok=lambda d: 'database' in d['entries'])

    section('Xac thuc (/auth)')
    email = f'tacgia@{DOMAIN}'
    account = {'email': email, 'password': PASSWORD, 'displayName': 'Tac gia kiem thu'}
    session = check('/auth/register', 201, 'POST', '/auth/register', body=account,
                    ok=lambda d: d['user']['roles'] == ['Author'])
    check('/auth/register (email trung)', 409, 'POST', '/auth/register', body=account)
    check('/auth/register (mat khau yeu)', 422, 'POST', '/auth/register',
          body={**account, 'email': f'yeu@{DOMAIN}', 'password': '12345678'})
    session = check('/auth/login', 200, 'POST', '/auth/login', body={'email': email, 'password': PASSWORD},
                    ok=lambda d: d['accessToken'] and d['refreshToken'])
    check('/auth/login (sai mat khau)', 401, 'POST', '/auth/login', body={'email': email, 'password': 'Sai@12345'})
    token = session['accessToken']
    check('/auth/me (khong token)', 401, 'GET', '/auth/me')
    check('/auth/me (token gia)', 401, 'GET', '/auth/me', token=token[:-4] + 'AAAA')
    check('/auth/me', 200, 'GET', '/auth/me', token=token, ok=lambda d: d['email'] == email)
    check('/auth/me', 200, 'PATCH', '/auth/me', token=token, body={'bio': 'Thich nau an'},
          ok=lambda d: d['bio'] == 'Thich nau an' and d['displayName'] == 'Tac gia kiem thu')
    check('/auth/me (avatarUrl sai)', 422, 'PATCH', '/auth/me', token=token, body={'avatarUrl': 'javascript:alert(1)'})
    first = session['refreshToken']
    second = check('/auth/refresh', 200, 'POST', '/auth/refresh', body={'refreshToken': first},
                   ok=lambda d: d['refreshToken'] != first)['refreshToken']
    check('/auth/refresh (dung lai token cu)', 401, 'POST', '/auth/refresh', body={'refreshToken': first})
    check('/auth/refresh (token cung chuoi bi thu hoi)', 401, 'POST', '/auth/refresh', body={'refreshToken': second})
    again = send('POST', '/auth/login', body={'email': email, 'password': PASSWORD})[1]
    check('/auth/logout', 204, 'POST', '/auth/logout', token=again['accessToken'],
          body={'refreshToken': again['refreshToken']})
    check('/auth/refresh (sau khi logout)', 401, 'POST', '/auth/refresh', body={'refreshToken': again['refreshToken']})
    check('/auth/google (token sai)', 401, 'POST', '/auth/google', body={'idToken': 'khong-hop-le'})

    locked = f'khoa@{DOMAIN}'
    send('POST', '/auth/register', body={**account, 'email': locked})
    for _ in range(4):
        send('POST', '/auth/login', body={'email': locked, 'password': 'Sai@12345'})
    check('/auth/login (sai lan thu 5: khoa)', 423, 'POST', '/auth/login',
          body={'email': locked, 'password': 'Sai@12345'})

    admin = send('POST', '/auth/login', body={'email': 'admin@culinaryblog.local',
                                              'password': settings['Seed']['Password']})[1]['accessToken']
    other = send('POST', '/auth/register', body={**account, 'email': f'khac@{DOMAIN}'})[1]['accessToken']

    section('Danh muc (/categories)')
    categories = check('/categories', 200, 'GET', '/categories', ok=lambda d: len(d) >= 20)
    busy = max(categories, key=lambda c: c['recipeCount'])
    check('/categories/{slug}', 200, 'GET', f"/categories/{busy['slug']}?pageSize=2",
          ok=lambda d: len(d['recipes']['items']) == 2)
    check('/categories/{slug} (khong co)', 404, 'GET', '/categories/khong-co')
    check('/categories (khong token)', 401, 'POST', '/categories', body={'name': CATEGORY})
    check('/categories (vai tro Author)', 403, 'POST', '/categories', token=token, body={'name': CATEGORY})
    category = check('/categories (Admin)', 201, 'POST', '/categories', token=admin, body={'name': CATEGORY})
    check('/categories/{id}', 200, 'PUT', f"/categories/{category['id']}", token=admin,
          body={'name': CATEGORY + ' moi', 'description': 'Da sua'},
          ok=lambda d: d['slug'] == category['slug'] and d['name'].endswith('moi'))
    check('/categories/{id} (trung ten)', 409, 'PUT', f"/categories/{category['id']}", token=admin,
          body={'name': busy['name']})
    check('/categories/{id} (con cong thuc)', 409, 'DELETE', f"/categories/{busy['id']}", token=admin)
    empty = send('POST', '/categories', token=admin, body={'name': CATEGORY + ' xoa'})[1]
    check('/categories/{id}', 204, 'DELETE', f"/categories/{empty['id']}", token=admin)

    section('Cong thuc (/recipes)')
    check('/recipes', 200, 'GET', '/recipes?pageSize=5&difficulty=easy&maxCookTime=60&minServings=2&sort=title',
          ok=lambda d: all(r['difficulty'] == 'Easy' and r['cookTime'] <= 60 and r['servings'] >= 2 for r in d['items']))
    # Lay 2 tu dau cua mot mon dang cong khai, bo dau, roi tim lai chinh mon do.
    sample = send('GET', '/recipes?pageSize=1&sort=title')[1]['items'][0]['title']
    words = ' '.join(sample.split()[:2]).lower().replace(chr(0x111), 'd')
    plain = ''.join(c for c in unicodedata.normalize('NFD', words) if not unicodedata.combining(c))
    check(f'/recipes/search?q={plain} (khong dau)', 200, 'GET', '/recipes/search?pageSize=50&q=' + quote(plain),
          ok=lambda d: sample in [r['title'] for r in d['items']])
    check('/recipes/search (tu khoa qua ngan)', 422, 'GET', '/recipes/search?q=a')
    check("/recipes/search (ky tu dac biet)", 200, 'GET', '/recipes/search?q=ga%27%26%7C%21%28%29%3A%2A')

    new = {'title': f'Mon kiem thu {STAMP}', 'description': 'Mo ta mon kiem thu', 'categoryId': category['id'],
           'prepTime': 10, 'cookTime': 20, 'servings': 2, 'difficulty': 'Medium',
           'nutrition': {'calories': 300, 'protein': 20}}
    check('/recipes (khong token)', 401, 'POST', '/recipes', body=new)
    check('/recipes (du lieu sai)', 422, 'POST', '/recipes', token=token, body={**new, 'title': 'abc', 'prepTime': 0})
    recipe = check('/recipes', 201, 'POST', '/recipes', token=token, body=new, ok=lambda d: d['status'] == 'Draft')
    base, slug = f"/recipes/{recipe['id']}", recipe['slug']
    check('/recipes/{slug} (khach xem ban nhap)', 403, 'GET', f'/recipes/{slug}')
    check('/recipes/{slug} (tac gia xem ban nhap)', 200, 'GET', f'/recipes/{slug}', token=token)
    update = {**new, 'title': new['title'] + ' da sua', 'rowVersion': recipe['rowVersion']}
    check('/recipes/{id} (tac gia khac)', 403, 'PUT', base, token=other, body=update)
    check('/recipes/{id}', 200, 'PUT', base, token=token, body=update,
          ok=lambda d: d['title'].endswith('da sua') and d['slug'] == slug)
    check('/recipes/{id} (rowVersion cu)', 409, 'PUT', base, token=token, body=update)
    check('/recipes/{id}/publish (chua co buoc)', 422, 'PATCH', base + '/publish', token=token)

    section('Nguyen lieu (/recipes/{id}/ingredients)')
    ingredient = check('/ingredients', 201, 'POST', base + '/ingredients', token=token,
                       body={'name': 'Thit ga', 'quantity': 500, 'unit': 'gram'})
    check('/ingredients (quantity am)', 422, 'POST', base + '/ingredients', token=token,
          body={'name': 'Muoi', 'quantity': -1})
    check('/ingredients/{ingId}', 200, 'PUT', f"{base}/ingredients/{ingredient['id']}", token=token,
          body={'name': 'Uc ga', 'quantity': 400, 'unit': 'gram'}, ok=lambda d: d['name'] == 'Uc ga')
    extra = send('POST', base + '/ingredients', token=token, body={'name': 'Hanh'})[1]
    check('/ingredients/{ingId}', 204, 'DELETE', f"{base}/ingredients/{extra['id']}", token=token)
    check('/ingredients/{ingId} (da xoa)', 404, 'DELETE', f"{base}/ingredients/{extra['id']}", token=token)

    def titles():
        steps = send('GET', f'/recipes/{slug}', token=token)[1]['steps']
        return [(s['stepNumber'], s['title']) for s in steps]

    section('Buoc thuc hien (/recipes/{id}/steps)')
    step = {}
    for name in ('B', 'C', 'D'):
        step[name] = check(f'/steps (them {name})', 201, 'POST', base + '/steps', token=token,
                           body={'title': name, 'description': 'Lam theo huong dan'})
    check('/steps (chen vao vi tri 1)', 201, 'POST', base + '/steps', token=token,
          body={'title': 'A', 'description': 'Chuan bi', 'stepNumber': 1}, ok=lambda d: d['stepNumber'] == 1)
    check('/steps/{stepId} (chuyen D len 2)', 200, 'PUT', f"{base}/steps/{step['D']['id']}", token=token,
          body={'title': 'D', 'description': 'Da chuyen', 'stepNumber': 2}, ok=lambda d: d['stepNumber'] == 2)
    check('/recipes/{slug} (thu tu A,D,B,C)', 200, 'GET', f'/recipes/{slug}', token=token,
          ok=lambda d: [s['title'] for s in d['steps']] == ['A', 'D', 'B', 'C'])
    check('/steps/{stepId}', 204, 'DELETE', f"{base}/steps/{step['D']['id']}", token=token)
    check('/recipes/{slug} (tu danh so lai 1,2,3)', 200, 'GET', f'/recipes/{slug}', token=token,
          ok=lambda d: [s['stepNumber'] for s in d['steps']] == [1, 2, 3])
    send('POST', base + '/steps', token=token, body={'title': 'E', 'description': 'Them sau khi xoa'})
    check('/recipes/{slug} (them sau xoa khong trung so)', 200, 'GET', f'/recipes/{slug}', token=token,
          ok=lambda d: [s['stepNumber'] for s in d['steps']] == [1, 2, 3, 4])

    section('Anh (/recipes/{id}/images)')
    image1 = check('/images', 201, 'POST', base + '/images', token=token,
                   ok=lambda d: d['isPrimary'], **multipart(PNG, 'image/png', {'altText': 'Anh 1'}))
    image2 = check('/images (dat lam anh chinh)', 201, 'POST', base + '/images', token=token,
                   ok=lambda d: d['isPrimary'], **multipart(PNG, 'image/png', {'isPrimary': 'true'}))
    check('/images (file gia mao)', 400, 'POST', base + '/images', token=token,
          **multipart(b'day khong phai anh', 'image/png'))
    check('/images (sai loai)', 400, 'POST', base + '/images', token=token, **multipart(PNG, 'text/html'))
    check('/images (qua 5MB)', 400, 'POST', base + '/images', token=token,
          **multipart(PNG + b'0' * (5 * 1024 * 1024), 'image/png'))
    check('/uploads/... (tai anh)', 200, 'GET', HOST + image1['originalUrl'])
    check('/images/{imgId}', 200, 'PATCH', f"{base}/images/{image1['id']}", token=token,
          body={'isPrimary': True, 'altText': 'Anh chinh'}, ok=lambda d: d['isPrimary'])
    check('/images/{imgId}', 204, 'DELETE', f"{base}/images/{image1['id']}", token=token)
    check('/recipes/{slug} (anh con lai len lam chinh)', 200, 'GET', f'/recipes/{slug}', token=token,
          ok=lambda d: [(i['id'], i['isPrimary']) for i in d['images']] == [(image2['id'], True)])

    section('Trang thai va xoa cong thuc')
    published = check('/recipes/{id}/publish', 200, 'PATCH', base + '/publish', token=token,
                      ok=lambda d: d['status'] == 'Published')
    time.sleep(1)
    check('/recipes/{id}/publish (goi lai, giu ngay cu)', 200, 'PATCH', base + '/publish', token=token,
          ok=lambda d: d['publishedAt'][:19] == published['publishedAt'][:19])
    check('/recipes/{slug} (khach xem bai cong khai)', 200, 'GET', f'/recipes/{slug}')
    check('/recipes/{id}/unpublish', 200, 'PATCH', base + '/unpublish', token=token,
          ok=lambda d: d['status'] == 'Draft')
    check('/recipes/{id}/archive (Admin)', 200, 'PATCH', base + '/archive', token=admin,
          ok=lambda d: d['status'] == 'Archived')
    check('/recipes/{id} (tac gia khac)', 403, 'DELETE', base, token=other)
    check('/recipes/{id}', 204, 'DELETE', base, token=token)
    check('/recipes/{slug} (da xoa mem)', 404, 'GET', f'/recipes/{slug}', token=token)
    return recipe['id']


def cleanup():
    users = f"select \"Id\" from \"AspNetUsers\" where \"Email\" like '%@{DOMAIN}'"
    for recipe_id in sql(f'select "Id" from "Recipes" where "AuthorId" in ({users});').split():
        shutil.rmtree(ROOT / 'src/CulinaryBlog.API/uploads/recipes' / recipe_id, ignore_errors=True)
    sql(f'delete from "Recipes" where "AuthorId" in ({users});'
        f'delete from "Categories" where "Name" like \'{CATEGORY}%\';'
        f'delete from "AspNetUsers" where "Email" like \'%@{DOMAIN}\';')


try:
    run()
finally:
    cleanup()
    counts = sql('select (select count(*) from "Categories") || \' danh muc, \' || '
                 '(select count(*) from "Recipes") || \' cong thuc\';')
    header = [f"Ket qua kiem thu API - chay ngay {datetime.now():%d/%m/%Y %H:%M}",
              f'Dat {total - failed}/{total} truong hop', f'Du lieu sau khi don: {counts}']
    (ROOT / 'docs').mkdir(exist_ok=True)
    (ROOT / 'docs/ket-qua-api.txt').write_text('\n'.join(header + lines) + '\n', encoding='utf-8-sig')
    print('\n'.join(header + lines))

sys.exit(1 if failed else 0)
