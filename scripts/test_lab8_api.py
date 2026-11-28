"""Kiểm thử API Lab 8: upload ảnh, quản lý công thức và trạng thái, người dùng, nhật ký hệ thống.

Cần API (http://localhost:5000) và MailHog đang chạy. Nên đặt giới hạn tần suất lớn khi chạy API:
  RateLimiting__General=100000 RateLimiting__Auth=100000 RateLimiting__Upload=100000

Chạy: python scripts/test_lab8_api.py
Script tự tạo tài khoản thử nên không làm thay đổi dữ liệu mẫu (trừ việc admin khóa/mở tài khoản thử).
"""
import json
import secrets
import struct
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zlib

# Cửa sổ dòng lệnh Windows mặc định không in được tiếng Việt.
sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://localhost:5000"
API = BASE + "/api/v1"
MAILHOG = "http://localhost:8025/api/v2"
SEED_PASSWORD = "Dev@Culinary123"
results = []


# ---------------------------------------------------------------- tiện ích HTTP
def request(method, url, body=None, token=None, headers=None, raw=None, content_type=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, method=method, data=data)
    req.add_header("Content-Type", content_type or "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            payload = r.read()
            return r.status, (json.loads(payload) if payload and "json" in r.headers.get("Content-Type", "") else payload), r.headers
    except urllib.error.HTTPError as e:
        payload = e.read()
        try:
            parsed = json.loads(payload) if payload else None
        except ValueError:
            parsed = payload
        return e.code, parsed, e.headers


def call(method, path, body=None, token=None, **kw):
    s, b, _ = request(method, API + path, body, token, **kw)
    return s, b


def upload(path, filename, content, mime, token, extra=None):
    """Gửi multipart/form-data với một file ở trường "file"."""
    boundary = "----lab8" + secrets.token_hex(8)
    parts = []
    for k, v in (extra or {}).items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\n'
                  f"Content-Type: {mime}\r\n\r\n").encode() + content + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    s, b, _ = request("POST", API + path, token=token, raw=b"".join(parts),
                      content_type=f"multipart/form-data; boundary={boundary}")
    return s, b


def png(width=4, height=3, color=(200, 80, 30)):
    """Tạo ảnh PNG thật (không cần Pillow): mỗi dòng 1 byte filter + RGB."""
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    rows = b"".join(b"\x00" + bytes(color) * width for _ in range(height))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b""))


def check(name, ok, info=""):
    ok = bool(ok)
    results.append(ok)
    print(("DAT " if ok else "LOI ") + name + (f"  ({info})" if info else ""))


def wait_api():
    for _ in range(60):
        try:
            with urllib.request.urlopen(BASE + "/health/ready", timeout=3) as r:
                if r.status == 200:
                    return
        except Exception:
            pass
        time.sleep(1)
    sys.exit("API chưa chạy ở " + BASE)


def login(email, password=SEED_PASSWORD):
    s, b = call("POST", "/auth/login", {"email": email, "password": password})
    assert s == 200, (email, s, b)
    return b


wait_api()
suffix = secrets.token_hex(4)

# ---------------------------------------------------------------- tài khoản
admin = login("admin@culinaryblog.local")
other = login("author1@culinaryblog.local")
A_TOKEN = None
email_a = f"lab8-{suffix}@culinaryblog.local"
pw_a = f"Lab8@{suffix}Aa"
s, reg = call("POST", "/auth/register", {"email": email_a, "password": pw_a, "displayName": "Tác giả Lab 8"})
check("Đăng ký tác giả thử", s == 201, s)
A_TOKEN, A_REFRESH, A_ID = reg["accessToken"], reg["refreshToken"], reg["user"]["id"]

# Email chào mừng dựng từ template HTML (gửi qua hàng đợi chạy nền).
welcome = None
for _ in range(20):
    with urllib.request.urlopen(f"{MAILHOG}/search?kind=to&query={urllib.parse.quote(email_a)}") as r:
        items = json.load(r)["items"]
    welcome = next((i for i in items if "Chào mừng" in i["Content"]["Headers"].get("Subject", [""])[0]
                    or "Ch=C3=A0o" in i["Content"]["Headers"].get("Subject", [""])[0]
                    or "=?utf-8" in i["Content"]["Headers"].get("Subject", [""])[0].lower()), None)
    if welcome:
        break
    time.sleep(0.5)
check("MailHog nhận email chào mừng sau khi đăng ký", welcome is not None)

# ---------------------------------------------------------------- công thức: tạo, xem
s, cats = call("GET", "/categories")
cat_id = (cats["items"] if isinstance(cats, dict) else cats)[0]["id"]

s, b = call("GET", "/recipes/manage/stats", token=A_TOKEN)
check("Thống kê của tác giả mới đều bằng 0", s == 200 and b["total"] == 0 and b["deleted"] == 0, b)

recipe_body = {
    "title": f"Canh chua cá lóc {suffix}", "description": "Món canh miền Tây chua ngọt.",
    "categoryId": cat_id, "prepTime": 15, "cookTime": 25, "servings": 4, "difficulty": "Medium",
    "ingredients": [{"name": "Cá lóc", "quantity": 500, "unit": "g"}, {"name": "Me chua", "quantity": 50, "unit": "g"}],
    "steps": [{"title": "Sơ chế", "description": "Làm sạch cá, cắt khúc."},
              {"title": "Nấu canh", "description": "Nấu nước me, cho cá và rau vào."}],
}
s, recipe = call("POST", "/recipes", recipe_body, A_TOKEN)
check("Tạo công thức -> 201, trạng thái Draft", s == 201 and recipe["status"] == "Draft", s)
rid, slug = recipe["id"], recipe["slug"]

s, b = call("GET", f"/recipes/manage/{rid}", token=A_TOKEN)
check("Chủ bài lấy công thức theo id để sửa", s == 200 and len(b["ingredients"]) == 2 and len(b["steps"]) == 2, s)
s, _ = call("GET", f"/recipes/manage/{rid}", token=other["accessToken"])
check("Tác giả khác lấy bài để sửa -> 403", s == 403, s)
s, _ = call("GET", f"/recipes/manage/{rid}")
check("Chưa đăng nhập vào trang quản lý -> 401", s == 401, s)
s, _ = call("GET", f"/recipes/{slug}")
check("Khách xem bản nháp -> 403", s == 403, s)

# ---------------------------------------------------------------- upload ảnh
s, img1 = upload(f"/recipes/{rid}/images", "mon.png", png(), "image/png", A_TOKEN, {"altText": "Ảnh chính"})
check("Upload ảnh PNG hợp lệ -> 201, ảnh đầu là ảnh chính", s == 201 and img1["isPrimary"], s)
st, _, hdr = request("GET", BASE + img1["originalUrl"])
check("Ảnh tải lên xem được qua /uploads", st == 200 and hdr.get("Content-Type") == "image/png", st)
s, img2 = upload(f"/recipes/{rid}/images", "mon2.png", png(color=(20, 120, 60)), "image/png", A_TOKEN)
check("Upload ảnh thứ hai không thành ảnh chính", s == 201 and not img2["isPrimary"], s)
s, b = upload(f"/recipes/{rid}/images", "gia.png", b"day khong phai anh png" * 3, "image/png", A_TOKEN)
check("File giả mạo đuôi PNG -> 400 FILE_MIME_INVALID", s == 400 and b["type"] == "FILE_MIME_INVALID", s)
s, b = upload(f"/recipes/{rid}/images", "a.gif", b"GIF89a" + b"0" * 20, "image/gif", A_TOKEN)
check("Định dạng GIF không được nhận -> 400", s == 400, s)
s, b = upload(f"/recipes/{rid}/images", "lon.png", png() + b"0" * (5 * 1024 * 1024 + 10), "image/png", A_TOKEN)
check("Ảnh lớn hơn 5MB -> 400 FILE_SIZE_EXCEEDED", s == 400 and b["type"] == "FILE_SIZE_EXCEEDED", s)
s, _ = upload(f"/recipes/{rid}/images", "x.png", png(), "image/png", other["accessToken"])
check("Tác giả khác upload vào bài không phải của mình -> 403", s == 403, s)
s, b = call("PATCH", f"/recipes/{rid}/images/{img2['id']}", {"isPrimary": True}, A_TOKEN)
check("Đặt ảnh thứ hai làm ảnh chính", s == 200 and b["isPrimary"], s)
s, b = call("GET", f"/recipes/manage/{rid}", token=A_TOKEN)
check("Chỉ còn một ảnh chính", s == 200 and [i["id"] for i in b["images"] if i["isPrimary"]] == [img2["id"]])
s, _ = call("DELETE", f"/recipes/{rid}/images/{img1['id']}", token=A_TOKEN)
st, _, _ = request("GET", BASE + img1["originalUrl"])
check("Xóa ảnh -> 204 và file trên đĩa bị xóa", s == 204 and st == 404, (s, st))

# ---------------------------------------------------------------- trạng thái
s, b = call("PATCH", f"/recipes/{rid}/publish", token=A_TOKEN)
check("Draft -> Published", s == 200 and b["status"] == "Published" and b["publishedAt"], s)
s, _ = call("GET", f"/recipes/{slug}")
check("Khách xem được bài đã đăng", s == 200, s)
s, b = call("GET", "/recipes/manage?status=Published", token=A_TOKEN)
check("Lọc danh sách quản lý theo Published", s == 200 and [r["id"] for r in b["items"]] == [rid], s)
s, b = call("PATCH", f"/recipes/{rid}/archive", token=A_TOKEN)
check("Published -> Archived", s == 200 and b["status"] == "Archived", s)
s, _ = call("GET", f"/recipes/{slug}")
check("Bài lưu trữ không còn công khai -> 403", s == 403, s)
s, b = call("PATCH", f"/recipes/{rid}/unpublish", token=A_TOKEN)
check("Archived -> Draft (đưa về nháp)", s == 200 and b["status"] == "Draft", s)

s, empty = call("POST", "/recipes", {**recipe_body, "title": f"Bản nháp trống {suffix}", "ingredients": [], "steps": []}, A_TOKEN)
s, b = call("PATCH", f"/recipes/{empty['id']}/publish", token=A_TOKEN)
check("Đăng bài chưa có bước/nguyên liệu -> 422", s == 422 and b["type"] == "RECIPE_PUBLISH_INCOMPLETE", s)

s, current = call("GET", f"/recipes/manage/{rid}", token=A_TOKEN)
upd = {k: current[k] for k in ["title", "description", "categoryId", "prepTime", "cookTime", "servings", "difficulty", "instructions"]}
s, b = call("PUT", f"/recipes/{rid}", {**upd, "rowVersion": "AAAAAAAAAAAAAAAAAAAAAA=="}, A_TOKEN)
check("Cập nhật với rowVersion cũ -> 409", s == 409, s)
s, b = call("PUT", f"/recipes/{rid}", {**upd, "servings": 6, "rowVersion": current["rowVersion"]}, A_TOKEN)
check("Cập nhật với rowVersion đúng -> 200", s == 200 and b["servings"] == 6, s)

s, _ = call("DELETE", f"/recipes/{rid}", token=A_TOKEN)
check("Xóa công thức -> 204", s == 204, s)
s, b = call("GET", "/recipes/manage?status=Deleted", token=A_TOKEN)
check("Bài đã xóa nằm trong mục Đã xóa", s == 200 and rid in [r["id"] for r in b["items"]] and b["items"][0]["isDeleted"], s)
s, _ = call("GET", f"/recipes/manage/{rid}", token=A_TOKEN)
check("Bài đã xóa không mở để sửa được -> 404", s == 404, s)
s, b = call("GET", "/recipes/manage/stats", token=A_TOKEN)
check("Thống kê: 1 bản nháp, 1 đã xóa", s == 200 and b["draft"] == 1 and b["deleted"] == 1 and b["total"] == 1, b)
s, _ = call("PATCH", f"/recipes/{rid}/restore", token=other["accessToken"])
check("Tác giả khác khôi phục -> 403", s == 403, s)
s, b = call("PATCH", f"/recipes/{rid}/restore", token=A_TOKEN)
check("Khôi phục bài đã xóa -> về Draft", s == 200 and b["status"] == "Draft", s)
s, _ = call("PATCH", f"/recipes/{rid}/restore", token=A_TOKEN)
check("Khôi phục bài chưa bị xóa -> 404", s == 404, s)

# Lỗi đã sửa: danh mục chỉ còn bài trong mục Đã xóa từng xóa được, khôi phục bài xong thì bài "biến mất".
ADM = admin["accessToken"]
s, tmp_cat = call("POST", "/categories", {"name": "Lab8 tam " + secrets.token_hex(3), "description": "Danh mục thử"}, ADM)
s, ghost = call("POST", "/recipes", {"title": "Bai trong danh muc tam " + secrets.token_hex(3), "description": "Thử khôi phục",
                                     "categoryId": tmp_cat["id"], "prepTime": 5, "cookTime": 5, "servings": 1,
                                     "difficulty": "Easy"}, ADM)
call("DELETE", f"/recipes/{ghost['id']}", token=ADM)
s, b = call("DELETE", f"/categories/{tmp_cat['id']}", token=ADM)
check("Không xóa được danh mục còn bài trong mục Đã xóa -> 409", s == 409 and b["type"] == "CATEGORY_DELETE_HAS_RECIPES", s)
s, b = call("PATCH", f"/recipes/{ghost['id']}/restore", token=ADM)
s2, _ = call("GET", f"/recipes/manage/{ghost['id']}", token=ADM)
check("Khôi phục bài đó vẫn mở để sửa được", s == 200 and s2 == 200, (s, s2))
# Dọn dữ liệu: chuyển bài sang danh mục mẫu, xóa danh mục tạm và bài thử.
upd = {k: b[k] for k in ["title", "description", "prepTime", "cookTime", "servings", "difficulty", "instructions"]}
call("PUT", f"/recipes/{ghost['id']}", {**upd, "categoryId": cat_id, "rowVersion": b["rowVersion"]}, ADM)
s, _ = call("DELETE", f"/categories/{tmp_cat['id']}", token=ADM)
check("Hết bài thì xóa được danh mục -> 204", s == 204, s)
call("DELETE", f"/recipes/{ghost['id']}", token=ADM)

s, b = call("GET", "/recipes/manage?q=" + urllib.parse.quote("canh chua"), token=A_TOKEN)
check("Tìm trong trang quản lý theo tên (không phân biệt hoa thường)", s == 200 and b["totalCount"] == 1, b and b.get("totalCount"))
s, b = call("GET", "/recipes/manage?q=%25", token=A_TOKEN)
check("Ký tự % được hiểu theo nghĩa đen (không khớp tất cả)", s == 200 and b["totalCount"] == 0, b and b.get("totalCount"))
s, _ = call("GET", "/recipes/manage?scope=all", token=A_TOKEN)
check("Tác giả xem bài mọi người (scope=all) -> 403", s == 403, s)
s, b = call("GET", "/recipes/manage?scope=all&pageSize=50", token=admin["accessToken"])
check("Admin xem bài của mọi tác giả", s == 200 and b["totalCount"] > 2, b and b.get("totalCount"))
s, _ = call("GET", "/recipes/manage?status=Xoa", token=A_TOKEN)
check("Trạng thái lọc không hợp lệ -> 422", s == 422, s)

# ---------------------------------------------------------------- ảnh đại diện
s, prof = upload("/auth/me/avatar", "avatar.png", png(8, 8), "image/png", A_TOKEN)
first_avatar = prof.get("avatarUrl") if isinstance(prof, dict) else None
check("Upload ảnh đại diện -> hồ sơ có avatarUrl /uploads/avatars/", s == 200 and first_avatar.startswith("/uploads/avatars/"), s)
s, prof = upload("/auth/me/avatar", "avatar2.png", png(8, 8, (0, 0, 255)), "image/png", A_TOKEN)
st_old, _, _ = request("GET", BASE + first_avatar)
st_new, _, _ = request("GET", BASE + prof["avatarUrl"])
check("Đổi ảnh đại diện: ảnh cũ bị xóa, ảnh mới xem được", st_old == 404 and st_new == 200, (st_old, st_new))
s, b = call("PATCH", "/auth/me", {"avatarUrl": "javascript:alert(1)"}, A_TOKEN)
check("avatarUrl dạng javascript: bị chặn -> 422", s == 422, s)

# ---------------------------------------------------------------- người dùng
s, _ = call("GET", "/users", token=A_TOKEN)
check("Tác giả xem danh sách người dùng -> 403", s == 403, s)
s, b = call("GET", "/users?role=Author&pageSize=50", token=admin["accessToken"])
check("Admin lọc người dùng vai trò Author", s == 200 and all("Author" in u["roles"] for u in b["items"]), s)
s, b = call("GET", "/users?role=Admin", token=admin["accessToken"])
check("Lọc vai trò Admin chỉ ra quản trị viên", s == 200 and b["totalCount"] >= 1 and all("Admin" in u["roles"] for u in b["items"]), s)
s, b = call("GET", "/users?q=" + urllib.parse.quote(email_a), token=admin["accessToken"])
row = b["items"][0] if s == 200 and b["items"] else {}
check("Tìm người dùng theo email, có số công thức", row.get("id") == A_ID and row.get("recipeCount") == 2, row)
admin_id = admin["user"]["id"]
s, b = call("PATCH", f"/users/{admin_id}/lock", token=admin["accessToken"])
check("Admin tự khóa mình -> 422", s == 422 and b["type"] == "USER_LOCK_FORBIDDEN", s)
s, b = call("PATCH", f"/users/{A_ID}/lock", token=admin["accessToken"])
check("Admin khóa tài khoản tác giả", s == 200 and b["isActive"] is False, s)
s, _ = call("GET", "/auth/me", token=A_TOKEN)
check("Access token cũ của người bị khóa bị từ chối ngay -> 401", s == 401, s)
s, _ = call("POST", "/auth/refresh", {"refreshToken": A_REFRESH})
check("Refresh token của người bị khóa bị thu hồi -> 401", s == 401, s)
s, b = call("POST", "/auth/login", {"email": email_a, "password": pw_a})
check("Người bị khóa đăng nhập -> 403 AUTH_ACCOUNT_DISABLED", s == 403 and b["type"] == "AUTH_ACCOUNT_DISABLED", s)
s, b = call("GET", "/users?status=locked", token=admin["accessToken"])
check("Lọc người dùng đang bị khóa", s == 200 and A_ID in [u["id"] for u in b["items"]], s)
s, b = call("PATCH", f"/users/{A_ID}/unlock", token=admin["accessToken"])
check("Mở khóa tài khoản", s == 200 and b["isActive"] is True, s)
s, b = call("POST", "/auth/login", {"email": email_a, "password": pw_a})
check("Sau khi mở khóa đăng nhập lại được", s == 200, s)
A_TOKEN = b["accessToken"]
s, _ = call("PATCH", f"/users/khong-ton-tai/lock", token=admin["accessToken"])
check("Khóa tài khoản không tồn tại -> 404", s == 404, s)

# ---------------------------------------------------------------- nhật ký
cid = "lab8test" + secrets.token_hex(6)
st, _, hdr = request("GET", API + "/recipes/manage/stats", token=A_TOKEN,
                     headers={"X-Correlation-ID": cid})
check("Phản hồi trả lại X-Correlation-ID client gửi", hdr.get("X-Correlation-ID") == cid, hdr.get("X-Correlation-ID"))
_, _, hdr = request("GET", API + "/categories", headers={"X-Correlation-ID": "<script>xau chen</script>"})
bad = hdr.get("X-Correlation-ID", "")
check("Correlation ID không hợp lệ bị thay bằng mã mới", bad and "<" not in bad and len(bad) == 32, bad)
time.sleep(1.5)  # Serilog ghi file theo lô
s, logs = call("GET", "/admin/logs?q=" + cid, token=admin["accessToken"])
entries = logs["items"] if s == 200 else []
check("Admin tìm được nhật ký theo Correlation ID", s == 200 and len(entries) >= 1, s)
check("Bản ghi có CorrelationId, UserId, RequestPath",
      any(e["correlationId"] == cid and e["userId"] == A_ID and e["requestPath"] for e in entries), entries[:1])
check("Bản ghi request có mã trả về và thời gian xử lý",
      any(e["statusCode"] == 200 and e["elapsedMs"] is not None for e in entries))
s, logs = call("GET", "/admin/logs?level=Warning&take=50", token=admin["accessToken"])
check("Lọc mức Warning trở lên", s == 200 and all(e["level"] in ("Warning", "Error", "Fatal") for e in logs["items"]), s)
check("Có ghi cảnh báo khóa tài khoản", any("khóa tài khoản" in e["message"] for e in logs["items"]))
s, _ = call("GET", "/admin/logs", token=other["accessToken"])
check("Tác giả xem nhật ký -> 403", s == 403, s)
s, b = call("GET", "/admin/logs?date=27-11-2026", token=admin["accessToken"])
check("Ngày sai định dạng -> 400", s == 400 and b["type"] == "LOG_DATE_INVALID", s)
s, files = call("GET", "/admin/logs/files", token=admin["accessToken"])
check("Danh sách file nhật ký theo ngày", s == 200 and len(files) >= 1 and files[0]["sizeBytes"] > 0, s)
# Lỗi đã sửa: Serilog đặt tên file theo giờ máy nên "hôm nay" phải là ngày địa phương, không phải ngày UTC.
s, b = call("GET", "/admin/logs?take=1", token=admin["accessToken"])
today = time.strftime("%Y-%m-%d")
check("Mặc định đọc nhật ký hôm nay theo giờ máy chủ", s == 200 and b["date"] == today and files[0]["date"] == today,
      (b.get("date"), today))

print(f"\nTong: {sum(results)}/{len(results)} dat")
sys.exit(0 if all(results) else 1)
