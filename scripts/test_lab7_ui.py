"""Kiểm thử giao diện Lab 7 bằng Playwright (cần API, MailHog và frontend đang chạy).

Chạy: python scripts/test_lab7_ui.py
Tự đăng ký tài khoản thử mới, không đổi mật khẩu của tài khoản mẫu.
"""
import base64
import json
import quopri
import re
import secrets
import sys
import time
import urllib.parse
import urllib.request

from playwright.sync_api import sync_playwright

WEB = "http://localhost:3000"
MAILHOG = "http://localhost:8025/api/v2"
results = []


def check(name, ok, info=""):
    results.append(ok)
    print(("DAT " if ok else "LOI ") + name + (f"  ({info})" if info else ""), flush=True)


def latest_reset_link(email, timeout=10):
    end = time.time() + timeout
    while time.time() < end:
        with urllib.request.urlopen(f"{MAILHOG}/search?kind=to&query={urllib.parse.quote(email)}") as r:
            items = json.load(r)["items"]
        if items:
            content = items[0]["Content"]
            body = content["Body"]
            enc = content["Headers"].get("Content-Transfer-Encoding", [""])[0].lower()
            if enc == "base64":
                body = base64.b64decode(body).decode("utf-8")
            elif enc == "quoted-printable":
                body = quopri.decodestring(body.encode()).decode("utf-8")
            m = re.search(r'href="([^"]+reset-password[^"]+)"', body)
            if m:
                return m.group(1).replace("&amp;", "&")
        time.sleep(0.5)
    return None


def cards(page):
    return page.locator("[data-slot=card] [data-slot=card-title] a:visible")


suffix = secrets.token_hex(3)
email = f"ui-lab7-{suffix}@culinaryblog.local"
pw1, pw2, pw3 = f"Ui@{suffix}Aa1", f"Ui@{suffix}Bb2", f"Ui@{suffix}Cc3"

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome")
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # ----- Trang chủ -----
    page.goto(WEB + "/", wait_until="networkidle")
    sidebar = page.get_by_role("navigation", name="Danh mục món ăn")
    check("Trang chủ có header và footer", page.locator("header").count() > 0 and page.locator("footer").count() > 0)
    check("Sidebar hiện danh sách danh mục từ API", sidebar.locator("li").count() >= 10, f"{sidebar.locator('li').count()} danh mục")
    check("Main content hiện 9 công thức mới", cards(page).count() == 9, f"{cards(page).count()} thẻ")
    first_title = cards(page).first.inner_text()
    page.get_by_role("link", name="2", exact=True).first.click()
    page.wait_for_url("**/?page=2")
    page.wait_for_function("t => document.querySelector('[data-slot=card] [data-slot=card-title] a')?.textContent !== t", arg=first_title)
    check("Phân trang trang chủ đổi danh sách", cards(page).count() > 0 and cards(page).first.inner_text() != first_title)

    # ----- Danh mục -----
    page.goto(WEB + "/categories", wait_until="networkidle")
    cat_links = page.locator("main a[href^='/categories/']")
    check("Trang tất cả danh mục", cat_links.count() >= 20, f"{cat_links.count()} danh mục")
    href = cat_links.first.get_attribute("href")
    cat_links.first.click()
    page.wait_for_url("**" + href)
    page.wait_for_selector("text=công thức — trang")
    active = page.locator("nav[aria-label='Danh mục món ăn'] a[aria-current=page]")
    check("Trang danh mục: tiêu đề, công thức, mục đang chọn ở sidebar",
          page.locator("h1:visible").count() == 1 and cards(page).count() > 0 and active.count() == 1, href)

    # ----- Chi tiết công thức -----
    recipe_href = cards(page).first.get_attribute("href")
    cards(page).first.click()
    page.wait_for_url("**" + recipe_href)
    page.wait_for_selector("#steps-heading")
    page.wait_for_selector("#related-heading")
    body = page.inner_text("main:visible")
    check("Chi tiết: tên món, nguyên liệu, cách làm",
          "Nguyên liệu" in body and "Cách làm" in body and page.locator("h1:visible").count() == 1, recipe_href)
    check("Chi tiết: có các bước được đánh số", page.locator("#steps-heading:visible ~ ol > li").count() > 0)
    check("Chi tiết: đường dẫn và món cùng danh mục",
          page.get_by_role("navigation", name="Đường dẫn").count() == 1 and "Cùng danh mục" in body)
    page.goto(WEB + "/recipes/khong-ton-tai-" + suffix, wait_until="networkidle")
    page.wait_for_selector("text=404")
    noindex = page.locator("meta[name=robots][content*=noindex]").count() > 0
    check("Slug không tồn tại: hiện trang 404 và gắn noindex", noindex and "Không tìm thấy" in page.inner_text("main:visible"))

    # ----- Tìm kiếm -----
    page.goto(WEB + "/", wait_until="networkidle")
    page.locator("header input[name=q]").fill("pho")
    page.locator("header input[name=q]").press("Enter")
    page.wait_for_url("**/recipes/search?q=pho")
    page.wait_for_load_state("networkidle")
    titles = [cards(page).nth(i).inner_text() for i in range(cards(page).count())]
    check("Ô tìm ở header: 'pho' (không dấu) tìm được món có 'Phở'", any("Phở" in t or "phở" in t for t in titles), f"{len(titles)} kết quả")
    check("Ô từ khóa giữ lại giá trị", page.locator("main input[name=q]").input_value() == "pho")
    page.goto(WEB + "/recipes/search?q=zzzkhongcomonnay", wait_until="networkidle")
    check("Không có kết quả thì báo rõ", "Không tìm thấy kết quả" in page.inner_text("main:visible"))
    page.goto(WEB + "/recipes/search?difficulty=Hard", wait_until="networkidle")
    check("Tìm chỉ bằng bộ lọc (không từ khóa) vẫn có kết quả",
          cards(page).count() > 0 and "Không tìm kiếm được" not in page.inner_text("main:visible"))
    page.goto(WEB + "/?page=999", wait_until="networkidle")
    page.wait_for_selector("text=Không có trang 999")
    page.get_by_role("link", name="Về trang").click()
    page.wait_for_url("**/?page=*")
    page.wait_for_function("() => [...document.querySelectorAll('[data-slot=card-title] a')].some(a => a.offsetParent)")
    check("Trang vượt quá số trang có nút quay về trang cuối", cards(page).count() > 0)
    page.goto(WEB + "/recipes?difficulty=Easy&sort=cookTime", wait_until="networkidle")
    badges = page.locator("[data-slot=card] [data-slot=badge]").all_inner_texts()
    check("Lọc độ khó Dễ ở danh sách công thức", len(badges) > 0 and "Trung bình" not in badges and "Khó" not in badges)

    # ----- Đăng ký, đăng xuất, đăng nhập -----
    page.goto(WEB + "/register", wait_until="networkidle")
    page.fill("#displayName", "Người thử Lab 7")
    page.fill("#email", email)
    page.fill("#password", "yeu")
    page.fill("#confirmPassword", "khac")
    page.click("button[type=submit]")
    time.sleep(0.5)
    check("Đăng ký: báo lỗi ngay ở trình duyệt (mật khẩu yếu, nhập lại không khớp)",
          page.locator("#password-msg.text-destructive").count() == 1 and page.locator("#confirmPassword-msg").count() == 1)
    page.fill("#password", pw1)
    page.fill("#confirmPassword", pw1)
    page.click("button[type=submit]")
    page.wait_for_url("**/dashboard", timeout=15000)
    check("Đăng ký thành công, vào trang quản lý", "Người thử Lab 7" in page.inner_text("header"))

    page.goto(WEB + "/login", wait_until="networkidle")
    page.wait_for_url("**/dashboard", timeout=10000)
    check("Đã đăng nhập mở /login thì bị chuyển đi", page.url.endswith("/dashboard"))
    page.goto(WEB + "/login?redirect=%2Flogin", wait_until="networkidle")
    page.wait_for_url("**/dashboard", timeout=10000)
    check("redirect trỏ về /login không gây vòng lặp", page.url.endswith("/dashboard"))

    page.click("button[aria-label='Menu tài khoản']")
    page.get_by_role("menuitem", name="Đăng xuất").click()
    page.wait_for_url(WEB + "/")
    check("Đăng xuất", page.locator("button[aria-label='Menu tài khoản']").count() == 0)

    page.goto(WEB + "/login", wait_until="networkidle")
    page.fill("#email", email)
    page.fill("#password", pw1)
    page.click("button[type=submit]")
    page.wait_for_url("**/dashboard", timeout=15000)
    check("Đăng nhập lại", page.locator("button[aria-label='Menu tài khoản']").count() == 1)

    # ----- Hồ sơ -----
    page.goto(WEB + "/dashboard/profile", wait_until="networkidle")
    page.wait_for_selector("#displayName")
    page.fill("#avatarUrl", "khong-phai-url")
    page.click("button[type=submit]")
    time.sleep(0.4)
    check("Hồ sơ: URL ảnh sai bị chặn", page.locator("#avatarUrl-msg.text-destructive").count() == 1)
    page.fill("#avatarUrl", "")
    page.fill("#displayName", "Đầu Bếp Lab Bảy")
    page.fill("#bio", "Thích nấu phở và làm bánh.")
    page.click("button[type=submit]")
    page.wait_for_selector("text=Đã lưu hồ sơ")
    time.sleep(0.5)
    check("Hồ sơ: lưu thành công, tên trên header đổi ngay", "Đầu Bếp Lab Bảy" in page.inner_text("header"))
    page.reload(wait_until="networkidle")
    page.wait_for_selector("#bio")
    check("Hồ sơ: tải lại trang vẫn giữ giá trị (đã lưu ở API)",
          page.input_value("#displayName") == "Đầu Bếp Lab Bảy" and page.input_value("#bio") == "Thích nấu phở và làm bánh.")

    # ----- Đổi mật khẩu -----
    page.goto(WEB + "/dashboard/password", wait_until="networkidle")
    page.wait_for_selector("#currentPassword")
    page.fill("#currentPassword", "Sai@12345")
    page.fill("#newPassword", pw2)
    page.fill("#confirmPassword", pw2)
    page.click("button[type=submit]")
    page.wait_for_selector("#currentPassword-msg")
    check("Đổi mật khẩu: sai mật khẩu hiện tại báo dưới ô", "không đúng" in page.inner_text("#currentPassword-msg"))
    page.fill("#currentPassword", pw1)
    page.click("button[type=submit]")
    page.wait_for_selector("text=Đã đổi mật khẩu")
    check("Đổi mật khẩu thành công, vẫn đăng nhập", page.locator("button[aria-label='Menu tài khoản']").count() == 1)

    # ----- Quên mật khẩu -> email -> đặt lại -----
    page.click("button[aria-label='Menu tài khoản']")
    page.get_by_role("menuitem", name="Đăng xuất").click()
    page.wait_for_url(WEB + "/")
    page.goto(WEB + "/login", wait_until="networkidle")
    page.get_by_role("link", name="Quên mật khẩu?").click()
    page.wait_for_url("**/forgot-password")
    page.fill("#email", email)
    page.click("button[type=submit]")
    page.wait_for_selector("text=Kiểm tra hộp thư")
    check("Quên mật khẩu: báo đã gửi email", True)
    link = latest_reset_link(email)
    check("MailHog nhận email có liên kết đặt lại", link is not None, link and link[:50])
    page.goto(link, wait_until="networkidle")
    page.fill("#newPassword", pw3)
    page.fill("#confirmPassword", pw3)
    page.click("button[type=submit]")
    page.wait_for_url("**/login", timeout=15000)
    check("Đặt lại mật khẩu xong chuyển về đăng nhập", True)
    page.fill("#email", email)
    page.fill("#password", pw2)
    page.click("button[type=submit]")
    # Chỉ lấy khung lỗi trong form (Next.js cũng có một phần tử role=alert để đọc tên trang).
    page.wait_for_selector("form [role=alert]")
    check("Mật khẩu trước đó không còn dùng được", "không đúng" in page.inner_text("form [role=alert]"))
    page.fill("#password", pw3)
    page.click("button[type=submit]")
    page.wait_for_url("**/dashboard", timeout=15000)
    check("Đăng nhập bằng mật khẩu mới", True)

    page.click("button[aria-label='Menu tài khoản']")
    page.get_by_role("menuitem", name="Đăng xuất").click()
    page.wait_for_url(WEB + "/")
    page.goto(link, wait_until="networkidle")
    page.fill("#newPassword", pw3 + "x")
    page.fill("#confirmPassword", pw3 + "x")
    page.click("button[type=submit]")
    page.wait_for_selector("form [role=alert]")
    check("Liên kết đã dùng không dùng lại được", "không hợp lệ" in page.inner_text("form [role=alert]"))
    page.goto(WEB + "/reset-password", wait_until="networkidle")
    check("Trang đặt lại thiếu token báo liên kết không hợp lệ", "Liên kết không hợp lệ" in page.inner_text("main:visible"))

    check("Không có lỗi JavaScript trên trang", not errors, "; ".join(errors)[:120])
    browser.close()

print(f"\nTong: {sum(results)}/{len(results)} dat")
sys.exit(0 if all(results) else 1)
