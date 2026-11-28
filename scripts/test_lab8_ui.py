"""Kiểm thử giao diện Lab 8 bằng Playwright (cần API, MailHog và frontend `npm start` đang chạy).

Chạy: python scripts/test_lab8_ui.py [--shots]
  --shots: chụp màn hình các trang vào docs/images/lab8-web*.png để đưa vào báo cáo.
Tự đăng ký tác giả thử mới; admin mẫu chỉ khóa rồi mở lại đúng tài khoản thử đó.
"""
import json
import secrets
import struct
import sys
import urllib.request
import zlib
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

WEB = "http://localhost:3000"
API = "http://localhost:5000/api/v1"
SEED_PASSWORD = "Dev@Culinary123"
SHOTS = "--shots" in sys.argv
IMAGES = Path(__file__).resolve().parent.parent / "docs" / "images"
TMP = Path(__file__).resolve().parent / ".tmp-lab8"
results = []


def check(name, ok, info=""):
    ok = bool(ok)
    results.append(ok)
    print(("DAT " if ok else "LOI ") + name + (f"  ({info})" if info else ""), flush=True)


def shot(page, name, full=False):
    if SHOTS:
        page.wait_for_timeout(400)
        page.screenshot(path=str(IMAGES / f"lab8-{name}.png"), full_page=full)


def api(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body else None)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def png(color, size=(320, 240)):
    """Ảnh PNG thật, một màu, để thử tải lên."""
    w, h = size

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    rows = b"".join(b"\x00" + bytes(color) * w for _ in range(h))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b""))


def login(page, email, password):
    page.goto(WEB + "/login", wait_until="networkidle")
    page.fill("#email", email)
    page.fill("#password", password)
    page.get_by_role("button", name="Đăng nhập").click()
    page.wait_for_url("**/dashboard")


def pick(page, trigger_id, option):
    """Chọn một mục trong Select của shadcn/ui (Radix)."""
    page.locator(f"#{trigger_id}").click()
    page.get_by_role("option", name=option, exact=True).click()


suffix = secrets.token_hex(3)
email = f"ui-lab8-{suffix}@culinaryblog.local"
password = f"Ui@{suffix}Lab8"
title = f"Bún chả Hà Nội {suffix}"
api("POST", "/auth/register", {"email": email, "password": password, "displayName": "Đầu bếp Lab 8"})

TMP.mkdir(exist_ok=True)
(TMP / "pho.png").write_bytes(png((214, 120, 40)))
(TMP / "rau.png").write_bytes(png((60, 150, 70)))
(TMP / "avatar.png").write_bytes(png((40, 90, 200), (96, 96)))
(TMP / "dong.gif").write_bytes(b"GIF89a" + b"\x00" * 40)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome")
    author_ctx = browser.new_context(viewport={"width": 1366, "height": 900})
    page = author_ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # ----------------------------------------------------------- tác giả: menu và quyền
    login(page, email, password)
    nav = page.get_by_role("navigation", name="Menu quản lý")
    check("Menu tác giả không có mục quản trị", nav.get_by_role("link", name="Người dùng").count() == 0
          and nav.get_by_role("link", name="Viết công thức").count() == 1)
    page.goto(WEB + "/dashboard/users", wait_until="networkidle")
    check("Tác giả mở trang người dùng bị chặn", page.get_by_text("Chỉ dành cho quản trị viên").is_visible())

    # ----------------------------------------------------------- viết công thức
    page.goto(WEB + "/dashboard/recipes/new", wait_until="networkidle")
    page.get_by_role("button", name="Lưu nháp").click()
    expect(page.get_by_text("Một số ô chưa hợp lệ")).to_be_visible()
    check("Bấm lưu khi form trống: báo lỗi từng ô", page.get_by_text("Chọn danh mục.").is_visible()
          and page.locator("#title[aria-invalid=true]").count() == 1)
    shot(page, "web01-form-loi")

    page.fill("#title", title)
    page.fill("#description", "Chả nướng than hoa, nước chấm chua ngọt, ăn kèm bún và rau sống.")
    page.locator("#categoryId").click()
    page.get_by_role("option").first.click()
    pick(page, "difficulty", "Trung bình")
    page.fill("#servings", "4")
    page.get_by_label("Tên nguyên liệu 1").fill("Thịt ba chỉ")
    page.get_by_label("Số lượng nguyên liệu 1").fill("500")
    page.get_by_label("Đơn vị nguyên liệu 1").fill("g")
    page.get_by_role("button", name="Thêm nguyên liệu").click()
    page.get_by_label("Tên nguyên liệu 2").fill("Bún tươi")
    page.get_by_label("Số lượng nguyên liệu 2").fill("1")
    page.get_by_label("Đơn vị nguyên liệu 2").fill("kg")
    page.get_by_role("button", name="Thêm nguyên liệu").click()
    page.get_by_label("Tên nguyên liệu 3").fill("Nước mắm")
    page.get_by_label("Tên bước 1").fill("Ướp thịt")
    page.get_by_label("Cách làm bước 1").fill("Ướp thịt với hành, tỏi, nước mắm trong 1 giờ.")
    page.get_by_label("Hẹn giờ bước 1 (phút)").fill("60")
    page.get_by_role("button", name="Thêm bước").click()
    page.get_by_label("Tên bước 2").fill("Nướng chả")
    page.get_by_label("Cách làm bước 2").fill("Nướng trên than hoa đến khi vàng đều.")
    page.fill("#calories", "520")
    shot(page, "web02-viet-cong-thuc", full=True)
    page.get_by_role("button", name="Lưu nháp").click()
    page.wait_for_url("**/dashboard/recipes/*/edit")
    recipe_id = page.url.split("/")[-2]
    expect(page.get_by_text("Ảnh món ăn", exact=True)).to_be_visible()
    check("Lưu nháp xong chuyển sang trang sửa để thêm ảnh", "/edit" in page.url)
    check("Trạng thái ban đầu là Bản nháp", page.locator("aside").get_by_text("Bản nháp").is_visible())

    # ----------------------------------------------------------- ảnh
    page.locator("[data-testid=image-input]").set_input_files([str(TMP / "pho.png"), str(TMP / "rau.png")])
    expect(page.locator("[data-testid=image-card]")).to_have_count(2, timeout=15000)
    check("Tải 2 ảnh lên, ảnh đầu là ảnh bìa", page.locator("[data-testid=image-card]").first.get_by_text("Ảnh bìa", exact=True).is_visible())
    img_src = page.locator("[data-testid=image-card] img").first.get_attribute("src")
    check("Ảnh hiển thị từ máy chủ API", img_src.startswith("http://localhost:5000/uploads/recipes/"), img_src)
    page.locator("[data-testid=image-input]").set_input_files(str(TMP / "dong.gif"))
    expect(page.get_by_text("Chỉ nhận ảnh JPEG, PNG, WebP hoặc AVIF.")).to_be_visible()
    check("Ảnh GIF bị chặn ngay ở trình duyệt", True)
    page.get_by_role("button", name="Bỏ qua").click()
    page.locator("[data-testid=image-card]").nth(1).get_by_role("button", name="Đặt làm ảnh bìa").click()
    expect(page.locator("[data-testid=image-card]").nth(1).get_by_text("Ảnh bìa", exact=True)).to_be_visible()
    expect(page.locator("[data-testid=image-card]").first.get_by_text("Ảnh bìa", exact=True)).to_have_count(0)
    check("Đổi ảnh bìa", True)
    shot(page, "web03-anh-mon-an")

    # ----------------------------------------------------------- sửa: đổi thứ tự bước, xóa nguyên liệu
    page.get_by_role("button", name="Đưa bước 2 lên").click()
    page.get_by_role("button", name="Xóa nguyên liệu 3").click()
    page.fill("#servings", "6")
    check("Panel trạng thái nhắc lưu trước khi đổi trạng thái", page.get_by_text("Hãy lưu thay đổi trước").is_visible())
    page.get_by_role("button", name="Lưu thay đổi").click()
    expect(page.get_by_text("Đã lưu thay đổi")).to_be_visible()
    token = page.evaluate("JSON.parse(localStorage.getItem('culinary-blog-auth')).state.accessToken")
    saved = api("GET", f"/recipes/manage/{recipe_id}", token=token)
    check("Lưu sửa: thứ tự bước mới, còn 2 nguyên liệu, 6 khẩu phần",
          [s["title"] for s in saved["steps"]] == ["Nướng chả", "Ướp thịt"]
          and len(saved["ingredients"]) == 2 and saved["servings"] == 6,
          [s["title"] for s in saved["steps"]])
    page.reload(wait_until="networkidle")
    check("Tải lại trang vẫn đúng thứ tự bước", page.get_by_label("Tên bước 1").input_value() == "Nướng chả")

    # ----------------------------------------------------------- lưu lỗi giữa chừng (lỗi đã sửa)
    # Thông tin chính lưu được, nguyên liệu thứ nhất thêm được, nguyên liệu thứ hai lỗi mạng.
    # Trước khi sửa: lần lưu sau báo 409 (rowVersion cũ) hoặc thêm trùng nguyên liệu đã lưu.
    posts = {"n": 0}

    def flaky(route):
        if route.request.method == "POST":
            posts["n"] += 1
            if posts["n"] == 2:
                return route.fulfill(status=500, content_type="application/json",
                                     body='{"title":"Lỗi máy chủ thử nghiệm","status":500}')
        route.continue_()

    page.route("**/api/v1/recipes/*/ingredients", flaky)
    page.fill("#servings", "5")
    for name in ("Hành lá", "Tiêu xay"):
        page.get_by_role("button", name="Thêm nguyên liệu").click()
        page.get_by_label(f"Tên nguyên liệu {page.locator('[aria-label^=\"Tên nguyên liệu\"]').count()}").fill(name)
    page.get_by_role("button", name="Lưu thay đổi").click()
    expect(page.get_by_text("Mới lưu được một phần thay đổi")).to_be_visible(timeout=15000)
    check("Lưu lỗi giữa chừng: báo đã lưu một phần, giữ nội dung đang nhập",
          page.get_by_label("Tên nguyên liệu 4").input_value() == "Tiêu xay")
    page.unroute("**/api/v1/recipes/*/ingredients")
    page.get_by_role("button", name="Lưu thay đổi").click()
    expect(page.get_by_text("Đã lưu thay đổi")).to_be_visible()
    saved = api("GET", f"/recipes/manage/{recipe_id}", token=token)
    names = [i["name"] for i in saved["ingredients"]]
    check("Lưu lại sau lỗi: không bị 409, không thêm trùng nguyên liệu",
          names.count("Hành lá") == 1 and names.count("Tiêu xay") == 1 and len(names) == 4 and saved["servings"] == 5, names)

    # ----------------------------------------------------------- trạng thái
    page.locator("aside").get_by_role("button", name="Đăng bài").click()
    expect(page.get_by_text("Đã đăng công thức")).to_be_visible()
    expect(page.locator("aside [data-slot=badge]")).to_have_text("Đã đăng")
    check("Đăng bài: trạng thái thành Đã đăng", True)
    shot(page, "web04-sua-cong-thuc")
    slug = saved["slug"]
    page.goto(f"{WEB}/recipes/{slug}", wait_until="networkidle")
    check("Bài vừa đăng xem được ngay ở trang công khai (cache đã làm mới)",
          page.get_by_role("heading", name=title).is_visible())
    shot(page, "web05-bai-cong-khai")
    page.goto(f"{WEB}/dashboard/recipes/{recipe_id}/edit", wait_until="networkidle")
    page.locator("aside").get_by_role("button", name="Lưu trữ").click()
    expect(page.get_by_text("Đã lưu trữ công thức")).to_be_visible()
    expect(page.locator("aside [data-slot=badge]")).to_have_text("Lưu trữ")
    page.goto(f"{WEB}/recipes/{slug}", wait_until="networkidle")
    # Nội dung được stream sau phần khung nên phải chờ trang 404 hiện ra.
    expect(page.get_by_text("404 — Không tìm thấy trang")).to_be_visible()
    check("Bài lưu trữ không còn công khai, hiện trang 404 (không vỡ trang)",
          page.get_by_role("heading", name=title).count() == 0)

    # ----------------------------------------------------------- danh sách quản lý
    page.goto(WEB + "/dashboard/recipes", wait_until="networkidle")
    rows = page.locator("[data-testid=recipe-row]")
    check("Danh sách quản lý có bài vừa tạo", rows.filter(has_text=title).count() == 1)
    page.get_by_role("tab", name="Bản nháp").click()
    page.wait_for_url("**status=Draft")
    expect(rows.filter(has_text=title)).to_have_count(0)
    check("Lọc Bản nháp không có bài đã lưu trữ", True)
    page.get_by_role("tab", name="Lưu trữ").click()
    page.wait_for_url("**status=Archived")
    expect(rows.filter(has_text=title)).to_have_count(1)
    shot(page, "web06-danh-sach-luu-tru")
    rows.filter(has_text=title).get_by_role("button", name=f"Thao tác với {title}").click()
    page.get_by_role("menuitem", name="Xóa").click()
    dialog = page.get_by_role("alertdialog")
    expect(dialog).to_be_visible()
    shot(page, "web07-xac-nhan-xoa")
    dialog.get_by_role("button", name="Xóa").click()
    expect(page.get_by_text("Đã xóa công thức")).to_be_visible()
    page.get_by_role("tab", name="Đã xóa").click()
    page.wait_for_url("**status=Deleted")
    expect(rows.filter(has_text=title)).to_have_count(1)
    check("Bài bị xóa nằm trong tab Đã xóa", True)
    rows.filter(has_text=title).get_by_role("button", name=f"Thao tác với {title}").click()
    page.get_by_role("menuitem", name="Khôi phục").click()
    expect(page.get_by_text("Đã khôi phục về bản nháp")).to_be_visible()
    page.goto(WEB + "/dashboard/recipes?status=Draft&q=" + suffix, wait_until="networkidle")
    check("Khôi phục về Bản nháp, tìm được theo tên", rows.filter(has_text=title).count() == 1 and rows.count() == 1)

    # ----------------------------------------------------------- tổng quan, hồ sơ
    page.goto(WEB + "/dashboard", wait_until="networkidle")
    mine = page.get_by_role("region", name="Công thức của tôi")
    check("Tổng quan: 1 bản nháp của tôi, không có thống kê toàn hệ thống",
          mine.get_by_role("link", name="Bản nháp").inner_text().strip().endswith("1")
          and page.get_by_role("region", name="Toàn hệ thống").count() == 0)
    page.goto(WEB + "/dashboard/profile", wait_until="networkidle")
    page.locator("[data-testid=avatar-input]").set_input_files(str(TMP / "avatar.png"))
    expect(page.get_by_text("Đã đổi ảnh đại diện")).to_be_visible()
    avatar = page.locator("main [data-slot=avatar-image]").first.get_attribute("src")
    check("Đổi ảnh đại diện bằng tải ảnh lên", "/uploads/avatars/" in (avatar or ""), avatar)
    page.fill("#bio", "Thích món nướng.")
    page.get_by_role("button", name="Lưu thay đổi").click()
    expect(page.get_by_text("Đã lưu hồ sơ")).to_be_visible()
    check("Lưu hồ sơ khi ảnh đại diện là ảnh đã tải lên", True)
    shot(page, "web08-anh-dai-dien")

    # ----------------------------------------------------------- admin: người dùng
    admin_ctx = browser.new_context(viewport={"width": 1366, "height": 900})
    admin = admin_ctx.new_page()
    admin.on("pageerror", lambda e: errors.append(str(e)))
    login(admin, "admin@culinaryblog.local", SEED_PASSWORD)
    anav = admin.get_by_role("navigation", name="Menu quản lý")
    check("Menu admin có Người dùng và Nhật ký hệ thống",
          anav.get_by_role("link", name="Người dùng").count() == 1 and anav.get_by_role("link", name="Nhật ký hệ thống").count() == 1)
    check("Tổng quan admin có thống kê toàn hệ thống", admin.get_by_role("region", name="Toàn hệ thống").is_visible())
    shot(admin, "web09-tong-quan-admin")
    admin.goto(WEB + "/dashboard/users", wait_until="networkidle")
    urows = admin.locator("[data-testid=user-row]")
    expect(urows.first).to_be_visible()
    check("Trang người dùng có danh sách", urows.count() >= 5, urows.count())
    shot(admin, "web10-nguoi-dung")
    admin.get_by_role("tab", name="Quản trị viên").click()
    expect(urows.filter(has_not_text="Quản trị viên")).to_have_count(0)
    check("Lọc vai trò Quản trị viên", all("Quản trị viên" in urows.nth(i).inner_text() for i in range(urows.count())))
    admin.get_by_role("tab", name="Tác giả").click()
    admin.get_by_label("Tìm người dùng").fill(email)
    admin.get_by_label("Tìm người dùng").press("Enter")
    expect(urows).to_have_count(1)
    expect(urows.first).to_contain_text(email)  # chờ danh sách cũ (giữ tạm khi đang tải) được thay
    row = urows.first
    check("Tìm tác giả theo email, thấy số công thức", "1 bài" in row.inner_text(), row.inner_text().replace("\n", " | "))
    row.get_by_role("button", name="Khóa").click()
    admin.get_by_role("alertdialog").get_by_role("button", name="Khóa tài khoản").click()
    expect(row.get_by_text("Đã khóa")).to_be_visible()
    check("Khóa tài khoản tác giả", True)
    shot(admin, "web11-khoa-tai-khoan")

    page.goto(WEB + "/dashboard/recipes", wait_until="load")
    expect(page.get_by_text("Bạn cần đăng nhập")).to_be_visible(timeout=10000)
    check("Tác giả bị khóa bị đăng xuất ngay ở lần gọi API kế tiếp", True)

    row.get_by_role("button", name="Mở khóa").click()
    admin.get_by_role("alertdialog").get_by_role("button", name="Mở khóa").click()
    expect(row.get_by_text("Hoạt động")).to_be_visible()
    check("Mở khóa tài khoản", True)

    # ----------------------------------------------------------- admin: nhật ký
    admin.goto(WEB + "/dashboard/logs", wait_until="networkidle")
    lrows = admin.locator("[data-testid=log-row]")
    expect(lrows.first).to_be_visible()
    check("Trang nhật ký có dữ liệu", lrows.count() > 10, lrows.count())
    shot(admin, "web12-nhat-ky")
    admin.locator("#log-level").click()
    admin.get_by_role("option", name="Warning trở lên").click()
    # Danh sách cũ được giữ tạm trong lúc tải: chờ tới khi không còn dòng INFO/DEBU.
    expect(lrows.filter(has=admin.locator("[data-slot=badge]", has_text="INFO"))).to_have_count(0)
    expect(lrows.first).to_be_visible()
    levels = {lrows.nth(i).locator("[data-slot=badge]").first.inner_text() for i in range(lrows.count())}
    check("Lọc mức Warning trở lên", levels <= {"WARN", "ERRO", "FATA"}, levels)
    admin.get_by_label("Tìm trong nhật ký").fill("khóa tài khoản")
    admin.get_by_label("Tìm trong nhật ký").press("Enter")
    expect(lrows.first).to_contain_text("khóa tài khoản")
    check("Tìm thấy dòng nhật ký khóa tài khoản", True)
    shot(admin, "web13-nhat-ky-loc")
    admin.locator("#log-level").click()
    admin.get_by_role("option", name="Mọi mức").click()
    admin.get_by_role("button", name="Bỏ lọc từ khóa").click()
    admin.wait_for_load_state("networkidle")
    chip = admin.locator("[data-testid=log-row] button[title='Lọc mọi dòng của yêu cầu này']").first
    chip.click()
    admin.wait_for_load_state("networkidle")
    cid = admin.get_by_label("Tìm trong nhật ký").input_value()
    expect(lrows.first).to_be_visible()
    check("Bấm mã yêu cầu lọc mọi dòng cùng yêu cầu", len(cid) >= 8 and lrows.count() >= 1, f"{cid[:8]}: {lrows.count()} dòng")

    # ----------------------------------------------------------- điện thoại
    mobile = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
    m = mobile.new_page()
    login(m, "admin@culinaryblog.local", SEED_PASSWORD)
    m.goto(WEB + "/dashboard/recipes?scope=all", wait_until="networkidle")
    width = m.evaluate("document.documentElement.scrollWidth")
    check("Trang quản lý trên điện thoại không tràn ngang", width <= 390, width)
    shot(m, "web14-dien-thoai")

    check("Không có lỗi JavaScript trên trang", not errors, errors[:2])
    browser.close()

for f in TMP.iterdir():
    f.unlink()
TMP.rmdir()
print(f"\nTong: {sum(results)}/{len(results)} dat")
sys.exit(0 if all(results) else 1)
