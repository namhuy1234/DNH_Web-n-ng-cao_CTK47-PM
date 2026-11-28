using System.Text.RegularExpressions;
using Serilog;
using Serilog.Context;
using Serilog.Events;
using Serilog.Formatting.Compact;

namespace CulinaryBlog.API.Services;

/// <summary>
/// Structured logging bằng Serilog (CONS-010, FR-OBS-002): console dễ đọc khi phát triển,
/// file JSON mỗi ngày một file để lưu trữ và cho trang quản trị đọc lại.
/// Mọi bản ghi trong một request đều có CorrelationId, RequestPath và UserId (khi đã đăng nhập).
/// </summary>
public static partial class LoggingSetup
{
    public const string CorrelationHeader = "X-Correlation-ID";

    public static WebApplicationBuilder AddSerilogLogging(this WebApplicationBuilder builder)
    {
        var directory = Path.GetFullPath(builder.Configuration["Logs:Directory"] ?? "logs");

        builder.Services.AddSerilog((services, config) => config
            // Mức log đọc từ mục "Serilog" trong appsettings, có thể đổi không cần build lại.
            .ReadFrom.Configuration(builder.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Application", "CulinaryBlog.API")
            .WriteTo.Console(outputTemplate:
                "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {CorrelationId}{NewLine}{Exception}")
            .WriteTo.File(new CompactJsonFormatter(), Path.Combine(directory, "culinary-.json"),
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 14,
                fileSizeLimitBytes: 20 * 1024 * 1024,
                rollOnFileSizeLimit: true,
                // Ghi qua bộ đệm, đẩy xuống đĩa mỗi giây: request không phải chờ ghi đĩa.
                // (Chế độ shared khóa mutex và ghi đĩa ở mỗi dòng log, làm request chậm tới 2 giây
                // khi thư mục nằm trong OneDrive.) Trang quản trị vẫn đọc được vì mở với FileShare.ReadWrite.
                buffered: true,
                flushToDiskInterval: TimeSpan.FromSeconds(1)));

        return builder;
    }

    /// <summary>Gắn CorrelationId cho request: lấy từ header nếu hợp lệ, không thì tạo mới.</summary>
    public static IApplicationBuilder UseCorrelationId(this IApplicationBuilder app)
        => app.Use(async (context, next) =>
        {
            var incoming = context.Request.Headers[CorrelationHeader].ToString();
            // Chỉ nhận chuỗi ngắn, an toàn: không để client chèn ký tự xuống dòng vào log.
            var id = SafeId().IsMatch(incoming) ? incoming : Guid.NewGuid().ToString("N");

            context.TraceIdentifier = id;
            context.Response.OnStarting(() =>
            {
                context.Response.Headers[CorrelationHeader] = id;
                return Task.CompletedTask;
            });

            using (LogContext.PushProperty("CorrelationId", id))
                await next(context);
        });

    /// <summary>Đặt sau UseAuthentication: gắn UserId vào mọi bản ghi của request.</summary>
    public static IApplicationBuilder UseUserLogContext(this IApplicationBuilder app)
        => app.Use(async (context, next) =>
        {
            var userId = context.User.FindFirst("sub")?.Value;
            if (userId is null)
            {
                await next(context);
                return;
            }

            using (LogContext.PushProperty("UserId", userId))
                await next(context);
        });

    /// <summary>Mỗi request ghi một dòng tóm tắt: phương thức, đường dẫn, mã trả về, thời gian.</summary>
    public static IApplicationBuilder UseHttpRequestLogging(this IApplicationBuilder app)
        => app.UseSerilogRequestLogging(options =>
        {
            options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} trả {StatusCode} trong {Elapsed:0.0} ms";
            options.GetLevel = (context, elapsed, exception) =>
                exception is not null || context.Response.StatusCode >= 500 ? LogEventLevel.Error
                : context.Request.Path.StartsWithSegments("/health") ? LogEventLevel.Verbose
                // Request CORS preflight (OPTIONS) chỉ gây nhiễu, ghi ở mức Debug.
                : HttpMethods.IsOptions(context.Request.Method) ? LogEventLevel.Debug
                // Cảnh báo hiệu năng khi request chậm hơn 500 ms (FR-OBS-002).
                : elapsed > 500 ? LogEventLevel.Warning
                : LogEventLevel.Information;
            options.EnrichDiagnosticContext = (diagnostics, context) =>
            {
                diagnostics.Set("ClientIp", context.Connection.RemoteIpAddress?.ToString() ?? "");
                if (context.User.FindFirst("sub")?.Value is { } userId)
                    diagnostics.Set("UserId", userId);
            };
        });

    [GeneratedRegex("^[A-Za-z0-9_-]{8,64}$")]
    private static partial Regex SafeId();
}
