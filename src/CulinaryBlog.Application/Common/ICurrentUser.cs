namespace CulinaryBlog.Application.Common;

/// <summary>Người đang gửi request, lấy từ JWT.</summary>
public interface ICurrentUser
{
    string? UserId { get; }
    bool IsAdmin { get; }
}
