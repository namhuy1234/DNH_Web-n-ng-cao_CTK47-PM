using CulinaryBlog.Infrastructure.Persistence;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CulinaryBlog.API.Services;

public class DatabaseHealthCheck(CulinaryBlogDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken cancellationToken = default)
        => await db.Database.CanConnectAsync(cancellationToken)
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy("Không kết nối được PostgreSQL.");
}

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapHealthChecks("/health", new HealthCheckOptions { ResponseWriter = WriteAsync });
        // Liveness: chỉ xét tiến trình còn sống, không kiểm tra database.
        app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false, ResponseWriter = WriteAsync });
        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("ready"), ResponseWriter = WriteAsync
        });
    }

    private static Task WriteAsync(HttpContext context, HealthReport report)
        => context.Response.WriteAsJsonAsync(new
        {
            status = report.Status.ToString(),
            entries = report.Entries.ToDictionary(e => e.Key, e => new { status = e.Value.Status.ToString() })
        });
}
