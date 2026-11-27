using CulinaryBlog.Application.Common;

namespace CulinaryBlog.API.Services;

public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string? UserId => accessor.HttpContext?.User.FindFirst("sub")?.Value;
    public bool IsAdmin => accessor.HttpContext?.User.IsInRole("Admin") ?? false;
}
