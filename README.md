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
cmd /c "docker exec -i culinary-postgres psql -U culinary -d culinaryblog_lab3 < scripts\verify.sql"
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

## Chạy trên máy khác

Cần cài: Docker Desktop, .NET SDK 10, Git (hoặc tải ZIP). Không cần cài PostgreSQL.

**Windows** – clone (hoặc trên GitHub chọn nhánh `huy-lab3` → Code → Download ZIP rồi giải nén) và chạy:

```powershell
git clone https://github.com/namhuy1234/DNH_Web-n-ng-cao_CTK47-PM.git
```
```powershell
cd DNH_Web-n-ng-cao_CTK47-PM; git switch huy-lab3
```
```powershell
.\run-dev.bat
```

Script kiểm tra phần mềm và cổng, bật PostgreSQL bằng Docker, chạy backend trong cửa sổ riêng rồi mở trình duyệt.
Lần chạy đầu backend tự tạo database `culinaryblog_lab3` và dữ liệu mẫu (mỗi lab một database riêng nên chuyển qua lại giữa các lab không ảnh hưởng nhau).
Chỉ kiểm tra máy đã đủ điều kiện chưa: `.\run-dev.bat check`.

**macOS / Linux**: `bash run-dev.sh` (tương tự, `bash run-dev.sh check` để kiểm tra).

| Địa chỉ | Nội dung |
|---|---|
| http://localhost:5000 | API |

**Kiểm tra tự động**: `bash scripts/smoke-test.sh` (Windows dùng Git Bash) chạy lại toàn bộ như máy mới và gọi thử các địa chỉ chính.
CI trên GitHub chạy đúng script này trên máy Ubuntu sạch ở mỗi lần đẩy code (job `smoke`).

**Lỗi thường gặp**

| Hiện tượng | Cách xử lý |
|---|---|
| `port is already allocated` ở cổng 5432 | Máy đã cài PostgreSQL riêng: `set POSTGRES_PORT=5433` (PowerShell: `$env:POSTGRES_PORT=5433`) rồi chạy lại |
| Cổng 5000 đang bị chiếm | Tắt chương trình đang dùng cổng đó (cổng cần dùng: 5432, 5000) |
| Docker chưa chạy | Mở Docker Desktop, chờ báo Engine running |
| Script `.bat` báo lỗi lạ sau khi tải ZIP | Tải lại bản mới nhất của nhánh (file `.gitattributes` giữ đúng kiểu xuống dòng) |
