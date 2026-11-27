using System.Diagnostics;
using CulinaryBlog.Domain.Exceptions;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace CulinaryBlog.API.Middleware;

/// <summary>Bắt mọi lỗi và trả về Problem Details (RFC 7807).</summary>
public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client đã ngắt kết nối, không còn ai nhận phản hồi.
        }
        catch (Exception ex) when (!context.Response.HasStarted)
        {
            var problem = Map(ex);
            problem.Instance = context.Request.Path;
            problem.Extensions["traceId"] = Activity.Current?.Id ?? context.TraceIdentifier;

            if (problem.Status >= 500)
                logger.LogError(ex, "Lỗi chưa xử lý tại {Method} {Path}", context.Request.Method, context.Request.Path);
            else
                logger.LogWarning("{Status} tại {Method} {Path}: {Message}",
                    problem.Status, context.Request.Method, context.Request.Path, ex.Message);

            context.Response.Clear();
            context.Response.StatusCode = problem.Status!.Value;
            await context.Response.WriteAsJsonAsync(problem, problem.GetType(), options: null,
                contentType: "application/problem+json");
        }
    }

    private static ProblemDetails Map(Exception exception) => exception switch
    {
        ValidationException ex => new ValidationProblemDetails(ex.Errors
            .GroupBy(e => char.ToLowerInvariant(e.PropertyName[0]) + e.PropertyName[1..])
            .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()))
        {
            Type = ErrorCodes.ValidationError,
            Title = "Dữ liệu không hợp lệ",
            Status = StatusCodes.Status422UnprocessableEntity
        },
        NotFoundException ex => Create(StatusCodes.Status404NotFound, "Không tìm thấy", ex),
        ConflictException ex => Create(StatusCodes.Status409Conflict, "Xung đột dữ liệu", ex),
        ForbiddenException ex => Create(StatusCodes.Status403Forbidden, "Không có quyền", ex),
        DomainException ex => Create(StatusCodes.Status422UnprocessableEntity, "Vi phạm quy tắc nghiệp vụ", ex),
        BadHttpRequestException ex => new ProblemDetails
        {
            Type = "BAD_REQUEST",
            Title = "Yêu cầu không hợp lệ",
            Status = ex.StatusCode,
            Detail = "Tham số hoặc nội dung JSON sai định dạng."
        },
        // Không trả chi tiết lỗi hệ thống ra ngoài.
        _ => new ProblemDetails
        {
            Type = "INTERNAL_ERROR",
            Title = "Lỗi hệ thống",
            Status = StatusCodes.Status500InternalServerError,
            Detail = "Đã có lỗi xảy ra, vui lòng thử lại sau."
        }
    };

    private static ProblemDetails Create(int status, string title, DomainException ex)
        => new() { Type = ex.ErrorCode, Title = title, Status = status, Detail = ex.Message };
}
