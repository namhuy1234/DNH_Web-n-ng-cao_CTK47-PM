# Culinary Blog – Lab 8

Backend .NET 10 theo Clean Architecture, cơ sở dữ liệu PostgreSQL 16.

## Cấu trúc

| Project | Nội dung | Tham chiếu |
|---|---|---|
| `CulinaryBlog.Domain` | Entities, enums, BaseEntity, SlugHelper | không |
| `CulinaryBlog.Application` | Đăng ký MediatR, FluentValidation | Domain |
| `CulinaryBlog.Infrastructure` | Identity, DbContext, configurations, migrations, seeder | Application |
| `CulinaryBlog.API` | Minimal API, khởi động ứng dụng | Application, Infrastructure |

## Chạy chương trình

Cần .NET SDK 10 và Docker Desktop.

```powershell
docker compose up -d --wait
```

```powershell
dotnet run --project src/CulinaryBlog.API
```

Ở môi trường Development, ứng dụng tự chạy migration và tạo dữ liệu mẫu nếu database còn trống.
API chạy tại http://localhost:5000.

## Kiểm tra dữ liệu

```powershell
cmd /c "docker exec -i culinary-postgres psql -U culinary -d culinaryblog < scripts\verify.sql"
```

## Tạo migration mới

```powershell
dotnet tool restore
```

```powershell
dotnet ef migrations add TenMigration -p src/CulinaryBlog.Infrastructure -s src/CulinaryBlog.API -o Persistence/Migrations
```

## Tạo lại database từ đầu

Lệnh này xóa toàn bộ dữ liệu trong database phát triển.

```powershell
docker compose down -v
```

## Ghi chú thiết kế

- `ApplicationUser` đặt ở Infrastructure vì kế thừa `IdentityUser`; Domain không được phụ thuộc thư viện ngoài.
- PostgreSQL không có cấu hình tìm kiếm `vietnamese`, nên dùng `simple` kết hợp `unaccent`.
- `RowVersion` kiểu `bytea` không tự đổi trong PostgreSQL, nên được gán trong `AuditInterceptor`.
- Mật khẩu trong `appsettings.Development.json` và `docker-compose.yml` chỉ dùng cho máy phát triển.
- Dữ liệu mẫu sinh ngẫu nhiên nên nguyên liệu và các bước không nhất thiết đúng với món ăn thật.

## Lab 4: toàn bộ API (tiền tố /api/v1)

| Nhóm | Endpoint | Quyền |
|---|---|---|
| Auth | `POST /auth/register`, `/login`, `/google`, `/refresh` | Không |
| Auth | `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/me` | Đăng nhập |
| Danh mục | `GET /categories`, `GET /categories/{slug}` | Không |
| Danh mục | `POST /categories`, `PUT`/`DELETE /categories/{id}` | Admin |
| Công thức | `GET /recipes`, `/recipes/search`, `/recipes/{slug}` | Không (bản nháp: chủ bài, Admin) |
| Công thức | `POST /recipes`, `PUT`/`DELETE /recipes/{id}`, `PATCH .../publish`, `unpublish`, `archive` | Chủ bài, Admin |
| Nguyên liệu, bước | `POST`, `PUT`, `DELETE /recipes/{id}/ingredients`, `/steps` | Chủ bài, Admin |
| Ảnh | `POST`, `PATCH`, `DELETE /recipes/{id}/images` | Chủ bài, Admin |
| Health (không có tiền tố) | `GET /health`, `/health/live`, `/health/ready` | Không |

Tài khoản mẫu (chỉ máy phát triển): `admin@culinaryblog.local`, `author1@culinaryblog.local`;
mật khẩu ở mục `Seed:Password` trong `appsettings.Development.json`.

Đăng nhập Google cần điền `Google:ClientId`. Ảnh đang lưu trên đĩa (`uploads/`), chưa dùng MinIO.

## Lab 5: bảo mật, tài liệu API, frontend

- CORS chỉ cho origin trong `Cors:AllowedOrigins` (mặc định `http://localhost:3000`).
- Rate limit mỗi phút theo IP: chung 100, `/auth` 10, tải ảnh 5 (mục `RateLimiting`).
- Tài liệu API (chỉ Development): http://localhost:5000/scalar/v1 và `/openapi/v1.json`.
- Versioning theo đường dẫn `/api/v1`.

### Frontend (cần Node.js 20.9 trở lên)

```powershell
cd frontend
```
```powershell
npm install
```
```powershell
Copy-Item .env.example .env.local
```
```powershell
npm run dev
```

Mở http://localhost:3000. Đối chiếu kiểu TypeScript với API đang chạy: `npm run check:api`.

### Kiểm thử backend (cần Python 3)

Bảo mật và tài liệu: chạy API bình thường rồi `python scripts	est_security.py`.

Chức năng: nới rate limit trước khi chạy API, vì bộ này gửi rất nhiều request:

```powershell
$env:RateLimiting__General=100000; $env:RateLimiting__Auth=100000; $env:RateLimiting__Upload=100000
```
```powershell
dotnet run --project src/CulinaryBlog.API
```
```powershell
python scripts	est_api.py
```

## Unit test và CI

```powershell
dotnet test CulinaryBlog.slnx
```

Gồm test quy tắc nghiệp vụ, validator và Dependency Rule của Clean Architecture.
GitHub Actions (`.github/workflows/ci.yml`) build, test backend và kiểm tra frontend mỗi lần đẩy nhánh `huy-*`.

## Lab 6: tiện ích, shadcn/ui, store, giao diện và layout

| Phần | Vị trí |
|---|---|
| Lỗi API thống nhất (`ApiError`, `getErrorMessage`, `getFieldErrors`) | `frontend/lib/api/errors.ts` |
| Axios: gắn token, tự refresh khi 401, đổi lỗi thành `ApiError` | `frontend/lib/api/client.ts` |
| Hàm gọi API theo nhóm | `frontend/lib/api/auth.ts`, `recipes.ts` |
| Định dạng ngày, thời gian, phân trang | `frontend/lib/format.ts`, `pagination.ts` |
| shadcn/ui (style radix-nova, màu cam) | `frontend/components.json`, `frontend/components/ui/` |
| Store đăng nhập và giao diện (Zustand persist) | `frontend/store/auth-store.ts`, `ui-store.ts` |
| Component chung: header, footer, phân trang, loading, lỗi, trống | `frontend/components/layout/`, `frontend/components/common/` |
| Layout theo nhóm route | `app/(public)`, `app/(auth)`, `app/(dashboard)` |

Trang công thức, chi tiết và trang quản lý dùng dữ liệu mẫu (`lib/mock-data.ts`); trang chủ, danh mục,
đăng nhập, đăng ký và hồ sơ gọi API thật.

```powershell
cd frontend
```
```powershell
npm run test:utils
```

## Lab 7: tài khoản, hồ sơ, trang chủ, chi tiết, tìm kiếm, danh mục

Backend thêm 3 endpoint (tiền tố `/api/v1/auth`):

| Endpoint | Quyền | Mô tả |
|---|---|---|
| `POST /change-password` | Đăng nhập | Đổi mật khẩu; thu hồi mọi phiên cũ, trả phiên mới |
| `POST /forgot-password` | Không | Gửi email chứa liên kết đặt lại (luôn trả 202 để không lộ email đã đăng ký) |
| `POST /reset-password` | Không | Đặt mật khẩu mới bằng token trong email (hết hạn sau 30 phút, dùng một lần) |

Email gửi qua SMTP; khi phát triển dùng MailHog trong `docker-compose.yml` (xem thư tại http://localhost:8025).
Cấu hình ở mục `Email` của `appsettings.Development.json`; để trống `SmtpHost` thì email chỉ được ghi vào log.

Frontend:

- Form đăng ký, đăng nhập, quên mật khẩu, đặt lại mật khẩu, đổi mật khẩu, hồ sơ dùng React Hook Form + Zod
  (cùng quy tắc với backend), lỗi theo trường từ API được gắn vào đúng ô.
- Trang chủ có sidebar danh mục và danh sách công thức mới; trang chi tiết, tìm kiếm (không dấu), danh sách
  công thức có lọc, danh sách danh mục và công thức theo danh mục đều lấy dữ liệu thật từ API (cache vài phút).
- Trang quản lý (thống kê, bảng công thức) dùng dữ liệu mẫu ở Lab 7; Lab 8 chuyển sang API thật.

Kiểm thử (cần API, MailHog, frontend đang chạy; nới rate limit vì script đăng nhập nhiều lần):

```powershell
$env:RateLimiting__Auth=1000; dotnet run --project src/CulinaryBlog.API
```
```powershell
python scripts/test_password.py
```
```powershell
python scripts/test_lab7_ui.py
```

## Lab 8: upload ảnh, quản lý công thức, người dùng, nhật ký hệ thống

Chạy nhanh trên Windows (Docker, API, frontend mỗi thứ một cửa sổ):

```powershell
.\run-dev.bat
```
```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-health.ps1
```

### Backend (tiền tố `/api/v1`)

| Endpoint | Quyền | Mô tả |
|---|---|---|
| `GET /recipes/manage?status=&q=&scope=` | Tác giả, Admin | Công thức mọi trạng thái, kể cả `Deleted` (xóa mềm); `scope=all` chỉ Admin |
| `GET /recipes/manage/stats` | Tác giả, Admin | Số bài theo trạng thái |
| `GET /recipes/manage/{id}` | Chủ bài, Admin | Lấy bài theo id để sửa |
| `PATCH /recipes/{id}/restore` | Chủ bài, Admin | Khôi phục bài đã xóa về bản nháp |
| `POST /auth/me/avatar` | Đăng nhập | Tải ảnh đại diện (ảnh cũ trên máy chủ bị xóa) |
| `GET /users?role=&status=&q=` | Admin | Danh sách người dùng, số công thức của từng người |
| `PATCH /users/{id}/lock`, `/unlock` | Admin | Khóa: thu hồi refresh token và chặn access token ngay lập tức |
| `GET /admin/logs?date=&level=&q=`, `/admin/logs/files` | Admin | Đọc nhật ký Serilog |

Vòng đời công thức: `Draft → Published → Archived`, đưa về `Draft` được từ cả hai; mọi trạng thái xóa mềm
được thành `Deleted` và khôi phục về `Draft`. Ảnh: JPEG/PNG/WebP/AVIF tối đa 5 MB, kiểm tra magic bytes.

Logging (Serilog): console và file `src/CulinaryBlog.API/logs/culinary-YYYYMMDD.json` (giữ 14 ngày).
Mọi bản ghi có `CorrelationId` (header `X-Correlation-ID`), `RequestPath`, `UserId`; mỗi request ghi
một dòng tóm tắt (mã trả về, thời gian); MediatR `LoggingBehavior` ghi mọi command, cảnh báo khi quá 500 ms.
Email chào mừng và email đặt lại mật khẩu dựng từ template HTML trong `Infrastructure/Email/Templates`.

Lưu ý: chuỗi kết nối dùng `127.0.0.1` thay vì `localhost`. Docker chỉ mở cổng trên IPv4, còn `localhost`
được thử `::1` trước và trên Windows mất khoảng 2 giây mỗi lần mở kết nối mới.

### Frontend

| Trang | Nội dung |
|---|---|
| `/dashboard` | Thống kê theo trạng thái (của tôi; admin thêm toàn hệ thống), bài sửa gần đây |
| `/dashboard/recipes` | Tab trạng thái, tìm theo tên, admin xem mọi tác giả; đăng, gỡ, lưu trữ, xóa, khôi phục |
| `/dashboard/recipes/new` | Form công thức (React Hook Form + Zod): nguyên liệu, các bước, dinh dưỡng |
| `/dashboard/recipes/{id}/edit` | Thêm ảnh (kéo thả, tiến độ, ảnh bìa, mô tả), sửa nội dung, đổi trạng thái |
| `/dashboard/profile` | Tải ảnh đại diện |
| `/dashboard/users` | (Admin) lọc vai trò Quản trị viên / Tác giả, trạng thái, khóa và mở khóa |
| `/dashboard/logs` | (Admin) xem nhật ký: theo ngày, mức, từ khóa, lọc theo mã yêu cầu, theo dõi trực tiếp |

Sau mỗi lần sửa, Server Action `refreshPublicCache` (kiểm tra token qua `/auth/me`) gọi `updateTag` để trang
công khai hiện thay đổi ngay.

### Công cụ và kiểm thử

| Tệp | Ngôn ngữ | Việc |
|---|---|---|
| `run-dev.bat`, `run-tests.bat` | Batch | Chạy môi trường phát triển; chạy kiểm thử giống CI |
| `scripts/run-tests.sh` | Shell | Như `run-tests.bat` cho Linux/Git Bash, `--e2e` chạy thêm kiểm thử API và giao diện |
| `scripts/check-health.ps1` | PowerShell | Kiểm tra Docker, API, frontend, MailHog |
| `tools/load-test.mjs` | JavaScript | Đo tải API công khai (p50/p95/p99) |
| `tools/log_report.py` | Python | Thống kê nhật ký: endpoint, request chậm, lỗi, người dùng |
| `scripts/report.sql` | SQL | Báo cáo dữ liệu và kiểm tra toàn vẹn ảnh bìa |
| `scripts/test_lab8_api.py`, `test_lab8_ui.py` | Python | Kiểm thử API (69 ca) và giao diện Playwright (38 ca) |

```powershell
node tools/load-test.mjs --requests 200
```
```powershell
python tools/log_report.py --top 10
```
```powershell
cmd /c "docker exec -i culinary-postgres psql -U culinary -d culinaryblog < scripts\report.sql"
```

### Lỗi tìm thấy khi rà soát lại Lab 8 (đã sửa, có kiểm thử đi kèm)

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| Trang Nhật ký 0h-7h sáng hiện ngày hôm nay nhưng đọc log hôm qua | Serilog đặt tên file theo giờ máy, API lại lấy "hôm nay" theo giờ UTC | Tính ngày theo múi giờ máy chủ (`LogLevels.LocalToday`) |
| Khôi phục bài trả 404 và bài biến mất khỏi mọi danh sách | Xóa được danh mục khi bài của nó còn trong mục Đã xóa | Đếm cả bài đã xóa khi xóa danh mục; chặn khôi phục nếu danh mục đã mất |
| Lưu công thức lỗi giữa chừng thì lần lưu sau báo 409 hoặc thêm trùng nguyên liệu | Form vẫn giữ rowVersion cũ và không biết id dòng vừa tạo | `PartialSaveError`: nạp lại bản mới nhất, ghi id dòng mới vào form |
| Xóa bài cuối của trang cuối thì bảng báo trống và mất phân trang | Trang hiện tại vượt quá tổng số trang | Tự lùi về trang cuối còn dữ liệu (công thức và người dùng) |
| Mở bài nháp/lưu trữ ở trang công khai làm vỡ trang (React #419) | API trả 403 cho khách nhưng frontend chỉ coi 404 là "không có" | `apiGet` coi 403 như 404 để hiện trang Không tìm thấy |

## Chạy trên máy khác

Cần cài: Docker Desktop, .NET SDK 10, Node.js 20.9 trở lên (nên dùng bản LTS), Git (hoặc tải ZIP). Không cần cài PostgreSQL.

**Windows** – clone (hoặc trên GitHub chọn nhánh `huy-lab8` → Code → Download ZIP rồi giải nén) và chạy:

```powershell
git clone https://github.com/namhuy1234/DNH_Web-n-ng-cao_CTK47-PM.git
```
```powershell
cd DNH_Web-n-ng-cao_CTK47-PM; git switch huy-lab8
```
```powershell
.\run-dev.bat
```

Script kiểm tra phần mềm và cổng, bật PostgreSQL bằng Docker, chạy backend và frontend trong cửa sổ riêng rồi mở trình duyệt.
Lần chạy đầu backend tự tạo database `culinaryblog` và dữ liệu mẫu (mỗi lab một database riêng nên chuyển qua lại giữa các lab không ảnh hưởng nhau).
Thêm `prod` (`run-dev.bat prod`) để build rồi chạy bản chính thức của frontend.
Chỉ kiểm tra máy đã đủ điều kiện chưa: `.\run-dev.bat check`.

**macOS / Linux**: `bash run-dev.sh` (tương tự, `bash run-dev.sh check` để kiểm tra).

| Địa chỉ | Nội dung |
|---|---|
| http://localhost:3000 | Trang web |
| http://localhost:5000 | API |
| http://localhost:5000/health | Kiểm tra API và database |
| http://localhost:5000/scalar/v1 | Tài liệu API |
| http://localhost:8025 | MailHog: xem email gửi đi |

Tài khoản mẫu (mật khẩu là `Seed:Password` trong `src/CulinaryBlog.API/appsettings.Development.json`, chỉ dùng trên máy phát triển):
`admin@culinaryblog.local` và `author1@culinaryblog.local`, mật khẩu `Dev@Culinary123`.

**Kiểm tra tự động**: `bash scripts/smoke-test.sh` (Windows dùng Git Bash) chạy lại toàn bộ như máy mới và gọi thử các địa chỉ chính.
CI trên GitHub chạy đúng script này trên máy Ubuntu sạch ở mỗi lần đẩy code (job `smoke`).

**Lỗi thường gặp**

| Hiện tượng | Cách xử lý |
|---|---|
| `port is already allocated` ở cổng 5432 | Máy đã cài PostgreSQL riêng: `set POSTGRES_PORT=5433` (PowerShell: `$env:POSTGRES_PORT=5433`) rồi chạy lại |
| Cổng 5000/3000 đang bị chiếm | Tắt chương trình đang dùng cổng đó (cổng cần dùng: 5432, 5000, 3000, 1025, 8025) |
| Docker chưa chạy | Mở Docker Desktop, chờ báo Engine running |
| Script `.bat` báo lỗi lạ sau khi tải ZIP | Tải lại bản mới nhất của nhánh (file `.gitattributes` giữ đúng kiểu xuống dòng) |
