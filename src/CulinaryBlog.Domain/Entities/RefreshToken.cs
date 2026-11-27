namespace CulinaryBlog.Domain.Entities;

/// <summary>SRS 7.8: chỉ lưu SHA-256 hash, không lưu token gốc.</summary>
public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = null!;
    public string TokenHash { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatedByIp { get; set; }
}
