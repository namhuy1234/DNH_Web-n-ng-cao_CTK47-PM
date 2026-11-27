namespace CulinaryBlog.Application.Common;

/// <summary>
/// Gửi email liên quan tới tài khoản. Tầng Infrastructure lo việc dựng liên kết, nội dung
/// và kênh gửi (MailHog khi phát triển), nên Application không cần biết cấu hình.
/// </summary>
public interface IAuthEmailService
{
    Task SendPasswordResetAsync(string email, string displayName, string resetToken, CancellationToken cancellationToken = default);
}
