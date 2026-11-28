using System.Collections.Concurrent;
using CulinaryBlog.Application.Users;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Infrastructure.Identity;

public class UserAdminService(CulinaryBlogDbContext db, TimeProvider clock) : IUserAdminService
{
    public async Task<(IReadOnlyList<UserListItemDto> Items, int TotalCount)> GetPageAsync(
        UserListFilter filter, CancellationToken cancellationToken)
    {
        var query = db.Users.AsNoTracking();

        if (filter.Role is not null)
        {
            var roleId = db.Roles.Where(r => r.Name == filter.Role).Select(r => r.Id);
            query = query.Where(u => db.UserRoles.Any(ur => ur.UserId == u.Id && roleId.Contains(ur.RoleId)));
        }

        if (filter.Status == "active") query = query.Where(u => u.IsActive);
        else if (filter.Status == "locked") query = query.Where(u => !u.IsActive);

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var pattern = "%" + filter.Keyword.Trim()
                .Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_") + "%";
            query = query.Where(u => EF.Functions.ILike(u.DisplayName, pattern) || EF.Functions.ILike(u.Email!, pattern));
        }

        var total = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderByDescending(u => u.CreatedAt).ThenBy(u => u.Id)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        return (await ToDtosAsync(users, cancellationToken), total);
    }

    public async Task<UserListItemDto?> GetAsync(string userId, CancellationToken cancellationToken)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        return user is null ? null : (await ToDtosAsync([user], cancellationToken))[0];
    }

    public async Task SetActiveAsync(string userId, bool active, CancellationToken cancellationToken)
    {
        var updated = await db.Users.Where(u => u.Id == userId).ExecuteUpdateAsync(s => s
            .SetProperty(u => u.IsActive, active)
            // Đổi SecurityStamp để mọi token Identity đã cấp (đặt lại mật khẩu...) hết hiệu lực.
            .SetProperty(u => u.SecurityStamp, Guid.NewGuid().ToString("N"))
            .SetProperty(u => u.ConcurrencyStamp, Guid.NewGuid().ToString()), cancellationToken);

        if (updated == 0)
            throw new NotFoundException(ErrorCodes.UserNotFound, "Không tìm thấy tài khoản.");
    }

    // Lấy vai trò và số công thức của cả trang bằng 2 truy vấn, không truy vấn theo từng người.
    private async Task<IReadOnlyList<UserListItemDto>> ToDtosAsync(
        IReadOnlyList<ApplicationUser> users, CancellationToken cancellationToken)
    {
        var ids = users.Select(u => u.Id).ToList();

        var roles = (await (from ur in db.UserRoles
                            join r in db.Roles on ur.RoleId equals r.Id
                            where ids.Contains(ur.UserId)
                            select new { ur.UserId, r.Name })
                .ToListAsync(cancellationToken))
            .ToLookup(x => x.UserId, x => x.Name!);

        var counts = await db.Recipes.AsNoTracking()
            .Where(r => ids.Contains(r.AuthorId))
            .GroupBy(r => r.AuthorId)
            .Select(g => new { AuthorId = g.Key, Total = g.Count(), Published = g.Count(r => r.Status == RecipeStatus.Published) })
            .ToDictionaryAsync(x => x.AuthorId, cancellationToken);

        var now = clock.GetUtcNow();
        return users.Select(u =>
        {
            counts.TryGetValue(u.Id, out var c);
            return new UserListItemDto(
                u.Id, u.Email!, u.DisplayName, u.AvatarUrl, roles[u.Id].OrderBy(r => r).ToList(),
                u.IsActive, u.LockoutEnd > now, u.CreatedAt, c?.Total ?? 0, c?.Published ?? 0);
        }).ToList();
    }
}

/// <summary>
/// Lưu trong bộ nhớ, đủ dài để access token cũ hết hạn. Khởi động lại máy chủ thì danh sách mất,
/// nhưng refresh token đã bị thu hồi nên người bị khóa cũng không lấy được token mới.
/// </summary>
public class AccessBlocklist(TimeProvider clock) : IAccessBlocklist
{
    private static readonly TimeSpan Duration = TimeSpan.FromMinutes(20);
    private readonly ConcurrentDictionary<string, DateTimeOffset> _blocked = new();

    public void Block(string userId) => _blocked[userId] = clock.GetUtcNow() + Duration;

    public void Unblock(string userId) => _blocked.TryRemove(userId, out _);

    public bool IsBlocked(string userId)
    {
        if (!_blocked.TryGetValue(userId, out var until)) return false;
        if (until > clock.GetUtcNow()) return true;

        _blocked.TryRemove(userId, out _);
        return false;
    }
}
