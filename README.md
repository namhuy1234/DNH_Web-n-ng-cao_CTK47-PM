# Culinary Blog – Lab 7

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
- Trang quản lý (thống kê, bảng công thức) vẫn dùng dữ liệu mẫu, làm ở Lab 8.

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
