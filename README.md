# Culinary Blog – Backend (Lab 3)

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

## Lab 3: API

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/v1/categories` | Danh sách danh mục kèm số công thức đã công khai |
| POST | `/api/v1/categories` | Tạo danh mục (chưa kiểm tra quyền Admin) |
| GET | `/api/v1/recipes` | Danh sách công thức: `page`, `pageSize`, `categoryId`, `difficulty`, `sort` |
| GET | `/api/v1/recipes/{slug}` | Chi tiết công thức |

Lỗi trả về dạng Problem Details: 400 sai định dạng, 403 chưa công khai, 404 không tìm thấy,
409 trùng dữ liệu, 422 dữ liệu không hợp lệ, 500 lỗi hệ thống.

Kiểm thử (chạy API trước, ở một cửa sổ PowerShell khác):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-api.ps1
```