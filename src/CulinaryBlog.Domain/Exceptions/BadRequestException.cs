namespace CulinaryBlog.Domain.Exceptions;

/// <summary>Dữ liệu gửi lên không dùng được, ví dụ file sai loại (HTTP 400).</summary>
public class BadRequestException(string errorCode, string message) : DomainException(errorCode, message);
