namespace CulinaryBlog.Domain.Exceptions;

/// <summary>Không tìm thấy tài nguyên (HTTP 404).</summary>
public class NotFoundException(string errorCode, string message) : DomainException(errorCode, message);
