using System.Text.Json.Serialization;
using Asp.Versioning;
using CulinaryBlog.API.Endpoints;
using CulinaryBlog.API.Middleware;
using CulinaryBlog.API.Services;
using CulinaryBlog.Application;
using CulinaryBlog.Application.Common;
using CulinaryBlog.Infrastructure;
using CulinaryBlog.Infrastructure.Persistence;
using CulinaryBlog.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddJwtAuth(builder.Configuration);
builder.Services.AddFrontendCors(builder.Configuration);
builder.Services.AddIpRateLimiting(builder.Configuration);
builder.Services.AddVersionedApiDocs();
builder.Services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database", tags: ["ready"]);
// Chặn sớm request quá lớn; giới hạn 5MB cho ảnh được kiểm tra ở tầng Application.
builder.WebHost.ConfigureKestrel(o =>
{
    o.Limits.MaxRequestBodySize = 8 * 1024 * 1024;
    o.AddServerHeader = false;
});
builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
// Lỗi đọc tham số/JSON ném exception để middleware trả Problem Details ở mọi môi trường.
builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();
// Các lỗi không phải exception (404 sai đường dẫn, 405...) cũng trả Problem Details.
app.UseStatusCodePages();

if (!app.Environment.IsDevelopment())
    app.UseHsts();

// Header bảo mật cho mọi phản hồi. Gắn trong OnStarting để không bị mất khi
// middleware xử lý lỗi gọi Response.Clear().
app.Use((context, next) =>
{
    context.Response.OnStarting(() =>
    {
        context.Response.Headers.XContentTypeOptions = "nosniff";
        context.Response.Headers.XFrameOptions = "DENY";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        return Task.CompletedTask;
    });
    return next(context);
});

var uploads = Path.GetFullPath(app.Configuration["Storage:Root"] ?? "uploads");
Directory.CreateDirectory(uploads);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploads),
    RequestPath = "/uploads"
});

// CORS đứng trước rate limiter để phản hồi 429 vẫn có header CORS.
app.UseCors(CorsSetup.Policy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Môi trường phát triển: tự cập nhật schema và tạo dữ liệu mẫu.
if (app.Configuration.GetValue<bool>("Database:MigrateAndSeed"))
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>().Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<DbSeeder>().SeedAsync();
}

app.MapGet("/", () => Results.Ok(new { name = "Culinary Blog API", status = "running" })).ExcludeFromDescription();

var v1 = app.NewVersionedApi()
    .MapGroup("/api/v{version:apiVersion}")
    .HasApiVersion(new ApiVersion(1, 0));
v1.MapAuthEndpoints();
v1.MapCategoryEndpoints();
v1.MapRecipeEndpoints();
v1.MapRecipeChildEndpoints();
app.MapHealthEndpoints();

// Tài liệu API chỉ bật ở môi trường phát triển.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Tắt thanh công cụ, trợ lý AI và telemetry của Scalar: chỉ cần phần tài liệu, không gửi dữ liệu ra ngoài.
    app.MapScalarApiReference(options => options
        .WithTitle("Culinary Blog API")
        .HideDeveloperTools()
        .DisableAgent()
        .DisableTelemetry()
        .DisableDefaultFonts());
}

app.Run();
