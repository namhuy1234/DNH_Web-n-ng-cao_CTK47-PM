# Culinary Blog – Backend (Lab 4)

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

Kiểm thử (cần Python 3; chạy API trước, ở cửa sổ khác):

```powershell
python scripts\test_api.py
```