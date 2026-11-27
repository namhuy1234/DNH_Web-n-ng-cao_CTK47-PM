using CulinaryBlog.Domain.Entities;

namespace CulinaryBlog.Domain.Repositories;

public interface IRefreshTokenRepository
{
    Task AddAsync(RefreshToken token, CancellationToken cancellationToken = default);
    Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default);

    /// <summary>Thu hồi nếu token còn hiệu lực. Trả về false khi đã bị thu hồi trước đó.</summary>
    Task<bool> TryRevokeAsync(Guid id, string? replacedByHash, CancellationToken cancellationToken = default);

    Task RevokeAllAsync(string userId, CancellationToken cancellationToken = default);
}
