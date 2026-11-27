"""Kiểm thử Lab 7: đổi mật khẩu, quên mật khẩu, đặt lại mật khẩu (cần API và MailHog đang chạy).

Chạy: python scripts/test_password.py
Script tự đăng ký một tài khoản thử mới nên không đổi mật khẩu của tài khoản mẫu.
"""
import base64
import json
import quopri
import re
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request

API = "http://localhost:5000/api/v1"
MAILHOG = "http://localhost:8025/api/v2"
results = []


def call(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, json.loads(raw) if raw else None


def check(name, ok, info=""):
    results.append(ok)
    print(("DAT " if ok else "LOI ") + name + (f"  ({info})" if info else ""))


def reset_link(email):
    # Email được gửi qua hàng đợi chạy nền nên có thể tới chậm một chút.
    items = []
    for _ in range(20):
        with urllib.request.urlopen(f"{MAILHOG}/search?kind=to&query={urllib.parse.quote(email)}") as r:
            items = json.load(r)["items"]
        if items:
            break
        time.sleep(0.5)
    if not items:
        return None
    content = items[0]["Content"]
    body = content["Body"]
    encoding = content["Headers"].get("Content-Transfer-Encoding", [""])[0].lower()
    if encoding == "base64":
        body = base64.b64decode(body).decode("utf-8")
    elif encoding == "quoted-printable":
        body = quopri.decodestring(body.encode()).decode("utf-8")
    m = re.search(r'href="([^"]+reset-password[^"]+)"', body)
    return m.group(1).replace("&amp;", "&") if m else None


suffix = secrets.token_hex(4)
email = f"thu-mat-khau-{suffix}@culinaryblog.local"
pw1, pw2, pw3 = f"Thu@{suffix}A1", f"Moi@{suffix}B2", f"Lai@{suffix}C3"

s, auth = call("POST", "/auth/register", {"email": email, "password": pw1, "displayName": "Tài khoản thử"})
check("Đăng ký tài khoản thử", s == 201, s)
token, refresh = auth["accessToken"], auth["refreshToken"]

# ----- Đổi mật khẩu -----
s, b = call("POST", "/auth/change-password", {"currentPassword": "Sai@12345", "newPassword": pw2}, token)
check("Đổi mật khẩu: sai mật khẩu hiện tại -> 400", s == 400 and b["type"] == "AUTH_WRONG_PASSWORD", s)
s, b = call("POST", "/auth/change-password", {"currentPassword": pw1, "newPassword": "yeu"}, token)
check("Đổi mật khẩu: mật khẩu mới yếu -> 422 kèm lỗi trường", s == 422 and "newPassword" in b.get("errors", {}), s)
s, b = call("POST", "/auth/change-password", {"currentPassword": pw1, "newPassword": pw1}, token)
check("Đổi mật khẩu: trùng mật khẩu cũ -> 422", s == 422, s)
s, b = call("POST", "/auth/change-password", {"currentPassword": pw1, "newPassword": pw2})
check("Đổi mật khẩu: chưa đăng nhập -> 401", s == 401, s)
s, b = call("POST", "/auth/change-password", {"currentPassword": pw1, "newPassword": pw2}, token)
check("Đổi mật khẩu thành công -> 200, cấp phiên mới", s == 200 and b["refreshToken"] != refresh, s)
s, _ = call("POST", "/auth/refresh", {"refreshToken": refresh})
check("Refresh token cũ bị thu hồi sau khi đổi mật khẩu", s == 401, s)
s, _ = call("POST", "/auth/login", {"email": email, "password": pw1})
check("Mật khẩu cũ không đăng nhập được", s == 401, s)
s, b = call("POST", "/auth/login", {"email": email, "password": pw2})
check("Mật khẩu mới đăng nhập được", s == 200, s)
session = b["refreshToken"]

# ----- Quên mật khẩu -----
s, b = call("POST", "/auth/forgot-password", {"email": f"khong-ton-tai-{suffix}@culinaryblog.local"})
check("Quên mật khẩu, email không tồn tại -> vẫn 202", s == 202, s)
s, b = call("POST", "/auth/forgot-password", {"email": "sai-dinh-dang"})
check("Quên mật khẩu, email sai định dạng -> 422", s == 422, s)
s, b = call("POST", "/auth/forgot-password", {"email": email})
check("Quên mật khẩu, email có thật -> 202", s == 202, s)
link = reset_link(email)
check("MailHog nhận email có liên kết đặt lại", link is not None and link.startswith("http://localhost:3000/reset-password"), link and link[:60])
q = urllib.parse.parse_qs(urllib.parse.urlparse(link).query)
reset_token = q["token"][0]
check("Liên kết chứa đúng email", q["email"][0] == email)

# ----- Đặt lại mật khẩu -----
s, b = call("POST", "/auth/reset-password", {"email": email, "token": "token-gia", "newPassword": pw3})
check("Đặt lại: token giả -> 400", s == 400 and b["type"] == "AUTH_RESET_TOKEN_INVALID", s)
s, b = call("POST", "/auth/reset-password", {"email": email, "token": reset_token, "newPassword": "yeu"})
check("Đặt lại: mật khẩu yếu -> 422", s == 422, s)
s, _ = call("POST", "/auth/reset-password", {"email": email, "token": reset_token, "newPassword": pw3})
check("Đặt lại thành công -> 204", s == 204, s)
s, _ = call("POST", "/auth/reset-password", {"email": email, "token": reset_token, "newPassword": pw3 + "x"})
check("Token đã dùng không dùng lại được -> 400", s == 400, s)
s, _ = call("POST", "/auth/refresh", {"refreshToken": session})
check("Mọi phiên cũ bị thu hồi sau khi đặt lại", s == 401, s)
s, _ = call("POST", "/auth/login", {"email": email, "password": pw3})
check("Đăng nhập bằng mật khẩu mới", s == 200, s)

# ----- Không lộ email qua thời gian phản hồi -----


def timed(address):
    start = time.perf_counter()
    call("POST", "/auth/forgot-password", {"email": address})
    return time.perf_counter() - start


known = sorted(timed(email) for _ in range(3))[1]
unknown = sorted(timed(f"khong-co-{suffix}-{i}@culinaryblog.local") for i in range(3))[1]
check("Quên mật khẩu trả về nhanh như nhau dù email có hay không",
      known < 0.5 and abs(known - unknown) < 0.3, f"có: {known:.2f}s, không: {unknown:.2f}s")

print(f"\nTong: {sum(results)}/{len(results)} dat")
