using System.Security.Cryptography;
using System.Text;
using CulinaryBlog.Application.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace CulinaryBlog.Infrastructure.Identity;

public class TokenService(IConfiguration configuration) : ITokenService
{
    private readonly JwtOptions _options = configuration.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new();

    public TimeSpan RefreshTokenLifetime => TimeSpan.FromDays(_options.RefreshTokenDays);

    public (string Token, DateTime ExpiresAt) CreateAccessToken(UserProfileDto user)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes);
        var claims = new Dictionary<string, object>
        {
            ["sub"] = user.Id,
            ["email"] = user.Email,
            ["role"] = user.Roles.ToArray(),
            ["jti"] = Guid.NewGuid().ToString()
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));

        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Claims = claims,
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        });

        return (token, expiresAt);
    }

    // 64 byte ngẫu nhiên an toàn; database chỉ lưu SHA-256 của chuỗi này.
    public string CreateRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public string Hash(string refreshToken)
        => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken)));
}
