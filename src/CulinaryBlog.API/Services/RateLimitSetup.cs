using System.Globalization;
using System.Threading.RateLimiting;
using CulinaryBlog.Domain.Exceptions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CulinaryBlog.API.Services;

public static class RateLimitSetup
{
    public const string AuthPolicy = "auth";
    public const string UploadPolicy = "upload";

    /// <summary>Giới hạn theo IP mỗi phút (NFR-SEC-003): chung 100, /auth 10, tải ảnh 5.</summary>
    public static IServiceCollection AddIpRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        var general = configuration.GetValue("RateLimiting:General", 100);
        var auth = configuration.GetValue("RateLimiting:Auth", 10);
        var upload = configuration.GetValue("RateLimiting:Upload", 5);
        var minute = TimeSpan.FromMinutes(1);

        return services.AddRateLimiter(options =>
        {
            // Health check không bị giới hạn để công cụ giám sát gọi liên tục được.
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                context.Request.Path.StartsWithSegments("/health")
                    ? RateLimitPartition.GetNoLimiter("health")
                    : RateLimitPartition.GetFixedWindowLimiter(ClientIp(context),
                        _ => new FixedWindowRateLimiterOptions { PermitLimit = general, Window = minute }));

            // Cửa sổ trượt cho /auth để chống dò mật khẩu ở ranh giới giữa hai phút.
            options.AddPolicy(AuthPolicy, context => RateLimitPartition.GetSlidingWindowLimiter(ClientIp(context),
                _ => new SlidingWindowRateLimiterOptions { PermitLimit = auth, Window = minute, SegmentsPerWindow = 6 }));

            options.AddPolicy(UploadPolicy, context => RateLimitPartition.GetFixedWindowLimiter(ClientIp(context),
                _ => new FixedWindowRateLimiterOptions { PermitLimit = upload, Window = minute }));

            options.OnRejected = WriteRejectedAsync;
        });
    }

    private static string ClientIp(HttpContext context)
        => context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private static async ValueTask WriteRejectedAsync(OnRejectedContext rejected, CancellationToken cancellationToken)
    {
        var seconds = rejected.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry)
            ? (int)Math.Ceiling(retry.TotalSeconds)
            : 60;
        var response = rejected.HttpContext.Response;

        response.StatusCode = StatusCodes.Status429TooManyRequests;
        response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);

        await response.WriteAsJsonAsync(new ProblemDetails
        {
            Type = ErrorCodes.RateLimitExceeded,
            Title = "Quá nhiều yêu cầu",
            Status = StatusCodes.Status429TooManyRequests,
            Detail = $"Vui lòng thử lại sau {seconds} giây."
        }, options: null, contentType: "application/problem+json", cancellationToken);
    }
}
