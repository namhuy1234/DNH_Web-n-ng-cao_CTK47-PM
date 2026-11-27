# Culinary Blog – Lab 5

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
