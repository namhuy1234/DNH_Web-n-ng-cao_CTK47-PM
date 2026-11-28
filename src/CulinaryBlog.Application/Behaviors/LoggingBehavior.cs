using System.Diagnostics;
using CulinaryBlog.Application.Common;
using CulinaryBlog.Domain.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Application.Behaviors;

/// <summary>
/// Ghi nhật ký mọi command/query đi qua MediatR (FR-OBS-002): tên, người gọi, thời gian xử lý.
/// Không ghi nội dung request vì có thể chứa mật khẩu hoặc token.
/// </summary>
public class LoggingBehavior<TRequest, TResponse>(ILogger<LoggingBehavior<TRequest, TResponse>> logger, ICurrentUser currentUser)
    : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    /// <summary>Xử lý lâu hơn ngưỡng này thì ghi cảnh báo hiệu năng.</summary>
    public const int SlowThresholdMs = 500;

    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var name = typeof(TRequest).Name;
        var isCommand = name.EndsWith("Command", StringComparison.Ordinal);
        var started = Stopwatch.GetTimestamp();

        try
        {
            var response = await next();
            var elapsed = Stopwatch.GetElapsedTime(started).TotalMilliseconds;

            if (elapsed > SlowThresholdMs)
                logger.LogWarning("{RequestName} chạy chậm: {ElapsedMs:0} ms (ngưỡng {Threshold} ms)",
                    name, elapsed, SlowThresholdMs);
            else
                // Command làm thay đổi dữ liệu nên ghi mức Information; query chỉ ghi Debug cho đỡ nhiễu.
                logger.Log(isCommand ? LogLevel.Information : LogLevel.Debug,
                    "{RequestName} xong trong {ElapsedMs:0} ms (người dùng {ActorId})",
                    name, elapsed, currentUser.UserId ?? "khách");

            return response;
        }
        catch (Exception ex) when (ex is ValidationException or DomainException)
        {
            // Lỗi nghiệp vụ là bình thường, middleware sẽ trả 4xx; chỉ ghi lại để tra cứu.
            logger.LogInformation("{RequestName} bị từ chối sau {ElapsedMs:0} ms: {Reason}",
                name, Stopwatch.GetElapsedTime(started).TotalMilliseconds, ex.Message);
            throw;
        }
    }
}
