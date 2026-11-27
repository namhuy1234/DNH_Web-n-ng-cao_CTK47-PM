using Microsoft.AspNetCore.Identity;

namespace CulinaryBlog.Infrastructure.Identity;

/// <summary>Đặt ở Infrastructure vì kế thừa IdentityUser (Domain không được phụ thuộc thư viện ngoài).</summary>
public class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
