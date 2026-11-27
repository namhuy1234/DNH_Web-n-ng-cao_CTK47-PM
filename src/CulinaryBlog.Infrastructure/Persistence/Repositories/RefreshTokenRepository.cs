using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Infrastructure.Persistence.Repositories;

public class RefreshTokenRepository(CulinaryBlogDbContext db) : IRefreshTokenRepository
{
    public async Task AddAsync(RefreshToken token, CancellationToken cancellationToken = default)
        => await db.RefreshTokens.AddAsync(token, cancellationToken);

    public Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default)
        => db.RefreshTokens.AsNoTracking().FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

    // Một câu UPDATE có điều kiện: hai request dùng cùng token thì chỉ một request thành công.
    public async Task<bool> TryRevokeAsync(Guid id, string? replacedByHash, CancellationToken cancellationToken = default)
        => await db.RefreshTokens
            .Where(t => t.Id == id && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s
                .SetProperty(t => t.RevokedAt, DateTime.UtcNow)
                .SetProperty(t => t.ReplacedByTokenHash, replacedByHash), cancellationToken) == 1;

    public Task RevokeAllAsync(string userId, CancellationToken cancellationToken = default)
        => db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow), cancellationToken);
}
