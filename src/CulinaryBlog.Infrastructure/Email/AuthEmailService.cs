using System.Net;
using System.Net.Mail;
using System.Threading.Channels;
using CulinaryBlog.Application.Common;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CulinaryBlog.Infrastructure.Email;

public class EmailOptions
{
    /// <summary>Địa chỉ frontend, dùng để dựng liên kết trong email.</summary>
    public string FrontendBaseUrl { get; set; } = "http://localhost:3000";
    public string From { get; set; } = "no-reply@culinaryblog.local";

    /// <summary>Để trống thì không gửi (khi phát triển chỉ ghi nội dung vào log).</summary>
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 1025;
    public bool SmtpSsl { get; set; }
    public string? SmtpUser { get; set; }
    public string? SmtpPassword { get; set; }
}

public record EmailMessage(string To, string Subject, string HtmlBody);

/// <summary>Hàng đợi email trong bộ nhớ; giới hạn để không bị dồn vô hạn khi SMTP lỗi.</summary>
public class EmailQueue
{
    private readonly Channel<EmailMessage> _channel = Channel.CreateBounded<EmailMessage>(
        new BoundedChannelOptions(500) { FullMode = BoundedChannelFullMode.DropWrite });

    public bool TryEnqueue(EmailMessage message) => _channel.Writer.TryWrite(message);
    public ChannelReader<EmailMessage> Reader => _channel.Reader;
}

/// <summary>
/// Dựng email rồi đưa vào hàng đợi, không chờ gửi SMTP. Nhờ vậy "quên mật khẩu" trả về
/// cùng tốc độ dù email có tài khoản hay không (không lộ email đã đăng ký qua thời gian phản hồi).
/// </summary>
public class AuthEmailService(IOptions<EmailOptions> options, EmailQueue queue, ILogger<AuthEmailService> logger)
    : IAuthEmailService
{
    private readonly EmailOptions _options = options.Value;

    public Task SendPasswordResetAsync(string email, string displayName, string resetToken, CancellationToken cancellationToken = default)
    {
        var link = $"{_options.FrontendBaseUrl.TrimEnd('/')}/reset-password" +
                   $"?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(resetToken)}";

        var html = $"""
            <p>Xin chào {WebUtility.HtmlEncode(displayName)},</p>
            <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu tài khoản Culinary Blog.</p>
            <p><a href="{WebUtility.HtmlEncode(link)}">Bấm vào đây để đặt mật khẩu mới</a>.
               Liên kết có hiệu lực 30 phút và chỉ dùng được một lần.</p>
            <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này; mật khẩu hiện tại vẫn giữ nguyên.</p>
            """;

        if (!queue.TryEnqueue(new EmailMessage(email, "Đặt lại mật khẩu Culinary Blog", html)))
            logger.LogError("Hàng đợi email đầy, bỏ email đặt lại mật khẩu");
        return Task.CompletedTask;
    }
}

/// <summary>Dịch vụ chạy nền lấy email từ hàng đợi và gửi qua SMTP.</summary>
public class EmailSenderService(
    EmailQueue queue, IOptions<EmailOptions> options, IHostEnvironment environment, ILogger<EmailSenderService> logger)
    : BackgroundService
{
    private readonly EmailOptions _options = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var message in queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await SendAsync(message, stoppingToken);
            }
            catch (Exception ex) when (ex is SmtpException or InvalidOperationException or IOException)
            {
                // Không có người dùng nào chờ kết quả: chỉ ghi log để quản trị xử lý.
                logger.LogError(ex, "Gửi email tới {To} thất bại", message.To);
            }
        }
    }

    private async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.SmtpHost))
        {
            // Email chứa token bí mật: chỉ ghi nội dung ra log ở máy phát triển, không bao giờ ở production.
            if (environment.IsDevelopment())
                logger.LogWarning("Chưa cấu hình Email:SmtpHost, email tới {To}:\n{Html}", message.To, message.HtmlBody);
            else
                logger.LogError("Chưa cấu hình Email:SmtpHost, không gửi được email tới {To}", message.To);
            return;
        }

        using var mail = new MailMessage(_options.From, message.To, message.Subject, message.HtmlBody) { IsBodyHtml = true };
        using var client = new SmtpClient(_options.SmtpHost, _options.SmtpPort) { EnableSsl = _options.SmtpSsl };
        if (!string.IsNullOrEmpty(_options.SmtpUser))
            client.Credentials = new NetworkCredential(_options.SmtpUser, _options.SmtpPassword);

        await client.SendMailAsync(mail, cancellationToken);
    }
}
