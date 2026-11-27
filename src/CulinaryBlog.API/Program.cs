using System.Text.Json.Serialization;
using CulinaryBlog.API.Endpoints;
using CulinaryBlog.API.Middleware;
using CulinaryBlog.Application;
using CulinaryBlog.Infrastructure;
using CulinaryBlog.Infrastructure.Persistence;
using CulinaryBlog.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
// Lỗi đọc tham số/JSON ném exception để middleware trả Problem Details ở mọi môi trường.
builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();
// Các lỗi không phải exception (404 sai đường dẫn, 405...) cũng trả Problem Details.
app.UseStatusCodePages();

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

app.Run();
