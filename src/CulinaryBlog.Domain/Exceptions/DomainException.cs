namespace CulinaryBlog.Domain.Exceptions;

/// <summary>Lớp cha của mọi lỗi nghiệp vụ. ErrorCode theo Phụ lục B của SRS.</summary>
public abstract class DomainException(string errorCode, string message) : Exception(message)
{
    public string ErrorCode { get; } = errorCode;
}
