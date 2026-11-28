using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;

namespace CulinaryBlog.API.Services;

public static class ApiDocsSetup
{
    private static readonly Dictionary<string, string> Summaries = new()
    {
        ["POST auth/register"] = "Đăng ký tài khoản",
        ["POST auth/login"] = "Đăng nhập bằng email và mật khẩu",
        ["POST auth/google"] = "Đăng nhập bằng Google ID token",
        ["POST auth/refresh"] = "Làm mới access token",
        ["POST auth/logout"] = "Đăng xuất, thu hồi refresh token",
        ["GET auth/me"] = "Xem hồ sơ",
        ["PATCH auth/me"] = "Cập nhật hồ sơ",
        ["GET categories"] = "Danh sách danh mục",
        ["GET categories/{slug}"] = "Danh mục và công thức trong danh mục",
        ["POST categories"] = "Tạo danh mục (Admin)",
        ["PUT categories/{id}"] = "Cập nhật danh mục (Admin)",
        ["DELETE categories/{id}"] = "Xóa danh mục (Admin)",
        ["GET recipes"] = "Danh sách công thức: lọc, sắp xếp, phân trang",
        ["GET recipes/search"] = "Tìm kiếm toàn văn, không phân biệt dấu",
        ["GET recipes/{slug}"] = "Chi tiết công thức",
        ["POST recipes"] = "Tạo công thức (bản nháp)",
        ["PUT recipes/{id}"] = "Cập nhật công thức (cần rowVersion)",
        ["DELETE recipes/{id}"] = "Xóa mềm công thức",
        ["PATCH recipes/{id}/publish"] = "Xuất bản",
        ["PATCH recipes/{id}/unpublish"] = "Hủy xuất bản",
        ["PATCH recipes/{id}/archive"] = "Lưu trữ",
        ["POST recipes/{id}/ingredients"] = "Thêm nguyên liệu",
        ["PUT recipes/{id}/ingredients/{ingredientId}"] = "Sửa nguyên liệu",
        ["DELETE recipes/{id}/ingredients/{ingredientId}"] = "Xóa nguyên liệu",
        ["POST recipes/{id}/steps"] = "Thêm bước thực hiện",
        ["PUT recipes/{id}/steps/{stepId}"] = "Sửa bước thực hiện",
        ["DELETE recipes/{id}/steps/{stepId}"] = "Xóa bước thực hiện",
        ["POST recipes/{id}/images"] = "Tải ảnh lên (tối đa 5MB)",
        ["PATCH recipes/{id}/images/{imageId}"] = "Sửa thông tin ảnh, đặt ảnh chính",
        ["DELETE recipes/{id}/images/{imageId}"] = "Xóa ảnh",
        // Lab 7
        ["POST auth/change-password"] = "Đổi mật khẩu, cấp phiên mới",
        ["POST auth/forgot-password"] = "Gửi email đặt lại mật khẩu",
        ["POST auth/reset-password"] = "Đặt mật khẩu mới bằng token trong email",
        // Lab 8
        ["POST auth/me/avatar"] = "Tải ảnh đại diện (tối đa 5MB)",
        ["GET recipes/manage"] = "Công thức để quản lý: mọi trạng thái, lọc, tìm theo tên",
        ["GET recipes/manage/stats"] = "Số công thức theo trạng thái",
        ["GET recipes/manage/{id}"] = "Lấy công thức theo id để sửa",
        ["PATCH recipes/{id}/restore"] = "Khôi phục công thức đã xóa về bản nháp",
        ["GET users"] = "Danh sách người dùng: lọc vai trò, trạng thái (Admin)",
        ["PATCH users/{id}/lock"] = "Khóa tài khoản, thu hồi mọi phiên (Admin)",
        ["PATCH users/{id}/unlock"] = "Mở khóa tài khoản (Admin)",
        ["GET admin/logs"] = "Đọc nhật ký hệ thống theo ngày, mức, từ khóa (Admin)",
        ["GET admin/logs/files"] = "Các ngày có file nhật ký (Admin)",
    };

    /// <summary>Versioning theo đường dẫn /api/v{n} và sinh tài liệu OpenAPI cho phiên bản 1.</summary>
    public static IServiceCollection AddVersionedApiDocs(this IServiceCollection services)
    {
        services.AddApiVersioning(options =>
            {
                options.DefaultApiVersion = new ApiVersion(1, 0);
                options.ReportApiVersions = true;
                options.ApiVersionReader = new UrlSegmentApiVersionReader();
            })
            .AddApiExplorer(options =>
            {
                options.GroupNameFormat = "'v'VVV";
                options.SubstituteApiVersionInUrl = true;
            });

        services.AddOpenApi("v1", options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Info = new OpenApiInfo
                {
                    Title = "Culinary Blog API",
                    Version = "v1",
                    Description = "Lỗi trả về dạng Problem Details. Endpoint có ổ khóa cần JWT."
                };
                document.Components ??= new OpenApiComponents();
                document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
                document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT"
                };
                return Task.CompletedTask;
            });

            options.AddOperationTransformer((operation, context, _) =>
            {
                var path = context.Description.RelativePath?.Replace("api/v1/", "").TrimEnd('/') ?? "";
                // Bỏ ràng buộc kiểu trong route, ví dụ {id:guid} thành {id}.
                path = System.Text.RegularExpressions.Regex.Replace(path, @":\w+}", "}");
                if (Summaries.TryGetValue($"{context.Description.HttpMethod} {path}", out var summary))
                    operation.Summary = summary;

                var metadata = context.Description.ActionDescriptor.EndpointMetadata;
                if (metadata.OfType<IAuthorizeData>().Any())
                {
                    operation.Security =
                    [
                        new OpenApiSecurityRequirement
                        {
                            [new OpenApiSecuritySchemeReference("Bearer", context.Document)] = []
                        }
                    ];
                    operation.Responses ??= [];
                    operation.Responses.TryAdd("401", new OpenApiResponse { Description = "Chưa đăng nhập" });
                    operation.Responses.TryAdd("403", new OpenApiResponse { Description = "Không có quyền" });
                }

                return Task.CompletedTask;
            });
        });

        return services;
    }
}
