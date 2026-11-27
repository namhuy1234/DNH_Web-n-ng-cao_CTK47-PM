namespace CulinaryBlog.Application.Auth;

public record UserProfileDto(
    string Id, string Email, string DisplayName, string? AvatarUrl, string? Bio,
    IReadOnlyList<string> Roles, bool EmailConfirmed, DateTime CreatedAt);

public record AuthResponseDto(
    string AccessToken, string RefreshToken, int ExpiresIn, DateTime ExpiresAt, UserProfileDto User);

public record GoogleUserInfo(string ProviderKey, string Email, string DisplayName, string? AvatarUrl);

public interface IIdentityService
{
    Task<UserProfileDto> RegisterAsync(string email, string password, string displayName);
    Task<UserProfileDto> ValidateCredentialsAsync(string email, string password);
    Task<UserProfileDto> FindOrCreateExternalAsync(GoogleUserInfo info);

    /// <summary>Trả null nếu tài khoản không còn tồn tại.</summary>
    Task<UserProfileDto?> GetProfileAsync(string userId);

    /// <summary>Ném lỗi nếu tài khoản bị vô hiệu hóa hoặc đang bị khóa.</summary>
    Task EnsureCanSignInAsync(string userId);

    Task<UserProfileDto> UpdateProfileAsync(string userId, string? displayName, string? avatarUrl, string? bio);
}

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateAccessToken(UserProfileDto user);
    string CreateRefreshToken();
    string Hash(string refreshToken);
    TimeSpan RefreshTokenLifetime { get; }
}

public interface IGoogleTokenVerifier
{
    Task<GoogleUserInfo> VerifyAsync(string idToken);
}
