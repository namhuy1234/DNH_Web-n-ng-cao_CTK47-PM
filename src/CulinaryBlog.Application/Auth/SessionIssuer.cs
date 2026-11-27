using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Repositories;

namespace CulinaryBlog.Application.Auth;

/// <summary>Tạo cặp access token và refresh token; chỉ lưu hash của refresh token.</summary>
public class SessionIssuer(ITokenService tokens, IRefreshTokenRepository refreshTokens, IUnitOfWork unitOfWork)
{
    public async Task<AuthResponseDto> IssueAsync(
        UserProfileDto user, CancellationToken cancellationToken, string? rawRefreshToken = null)
    {
        var (accessToken, expiresAt) = tokens.CreateAccessToken(user);
        var refreshToken = rawRefreshToken ?? tokens.CreateRefreshToken();

        await refreshTokens.AddAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokens.Hash(refreshToken),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.Add(tokens.RefreshTokenLifetime)
        }, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var expiresIn = (int)Math.Round((expiresAt - DateTime.UtcNow).TotalSeconds);
        return new AuthResponseDto(accessToken, refreshToken, expiresIn, expiresAt, user);
    }
}
