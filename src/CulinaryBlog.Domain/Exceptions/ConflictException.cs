namespace CulinaryBlog.Domain.Exceptions;

/// <summary>Dữ liệu bị trùng hoặc xung đột (HTTP 409).</summary>
public class ConflictException(string errorCode, string message) : DomainException(errorCode, message);
