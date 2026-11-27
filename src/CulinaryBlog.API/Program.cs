using System.Text.Json.Serialization;
using CulinaryBlog.API.Endpoints;
using CulinaryBlog.API.Middleware;
using CulinaryBlog.API.Services;
using CulinaryBlog.Application.Common;
using Microsoft.Extensions.FileProviders;
using CulinaryBlog.Application;
using CulinaryBlog.Infrastructure;
using CulinaryBlog.Infrastructure.Persistence;
using CulinaryBlog.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddJwtAuth(builder.Configuration);
builder.Services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database", tags: ["ready"]);
// Chặn sớm request quá lớn; giới hạn 5MB cho ảnh được kiểm tra ở tầng Application.
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 8 * 1024 * 1024);
builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
// Lỗi đọc tham số/JSON ném exception để middleware trả Problem Details ở mọi môi trường.
builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();
// Các lỗi không phải exception (404 sai đường dẫn, 405...) cũng trả Problem Details.
app.UseStatusCodePages();

var uploads = Path.GetFullPath(app.Configuration["Storage:Root"] ?? "uploads");
Directory.CreateDirectory(uploads);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploads),
    RequestPath = "/uploads",
    OnPrepareResponse = ctx => ctx.Context.Response.Headers.XContentTypeOptions = "nosniff"
});

app.UseAuthentication();
app.UseAuthorization();

// Môi trường phát triển: tự cập nhật schema và tạo dữ liệu mẫu.
if (app.Configuration.GetValue<bool>("Database:MigrateAndSeed"))
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<CulinaryBlogDbContext>().Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<DbSeeder>().SeedAsync();
}

app.MapGet("/", () => Results.Ok(new { name = "Culinary Blog API", status = "running" }));
app.MapCategoryEndpoints();
app.MapRecipeEndpoints();
app.MapRecipeChildEndpoints();
app.MapAuthEndpoints();
app.MapHealthEndpoints();

app.Run();
