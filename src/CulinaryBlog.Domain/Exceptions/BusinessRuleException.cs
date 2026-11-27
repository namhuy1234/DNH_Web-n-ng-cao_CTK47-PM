namespace CulinaryBlog.Domain.Exceptions;

/// <summary>Vi phạm quy tắc nghiệp vụ (HTTP 422).</summary>
public class BusinessRuleException(string errorCode, string message) : DomainException(errorCode, message);
