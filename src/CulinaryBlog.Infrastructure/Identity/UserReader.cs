using CulinaryBlog.Application.Common;
using CulinaryBlog.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Infrastructure.Identity;

public class UserReader(CulinaryBlogDbContext db) : IUserReader
{
    public async Task<IReadOnlyDictionary<string, string>> GetDisplayNamesAsync(
        IEnumerable<string> userIds, CancellationToken cancellationToken = default)
    {
        var ids = userIds.Distinct().ToList();

        return await db.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName, cancellationToken);
    }
}
