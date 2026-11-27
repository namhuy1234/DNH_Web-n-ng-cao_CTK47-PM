namespace CulinaryBlog.Domain.Exceptions;

/// <summary>Tài khoản đang bị khóa tạm (HTTP 423).</summary>
public class LockedException(string errorCode, string message) : DomainException(errorCode, message);
