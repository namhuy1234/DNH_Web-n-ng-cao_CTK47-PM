namespace CulinaryBlog.Domain.Common;

/// <summary>Lớp cha của các thực thể (SRS 7.1).</summary>
public abstract class BaseEntity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }

    /// <summary>Concurrency token, được gán lại mỗi lần lưu.</summary>
    public byte[] RowVersion { get; set; } = [];
}
