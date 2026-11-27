namespace CulinaryBlog.Domain.Exceptions;

/// <summary>Chưa xác thực được (HTTP 401).</summary>
public class UnauthorizedException(string errorCode, string message) : DomainException(errorCode, message);
