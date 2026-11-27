namespace CulinaryBlog.Domain.Exceptions;

/// <summary>Không có quyền truy cập tài nguyên (HTTP 403).</summary>
public class ForbiddenException(string errorCode, string message) : DomainException(errorCode, message);
