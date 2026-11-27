using CulinaryBlog.Application.Auth;
using CulinaryBlog.Domain.Exceptions;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;

namespace CulinaryBlog.Infrastructure.Identity;

public class GoogleTokenVerifier(IConfiguration configuration) : IGoogleTokenVerifier
{
    public async Task<GoogleUserInfo> VerifyAsync(string idToken)
    {
        // Chưa cấu hình ClientId thì từ chối, không chấp nhận token của ứng dụng khác.
        var clientId = configuration["Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            throw Invalid("Máy chủ chưa cấu hình đăng nhập Google.");

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] });

            if (!payload.EmailVerified)
                throw Invalid("Email Google chưa được xác minh.");

            return new GoogleUserInfo(payload.Subject, payload.Email, payload.Name ?? payload.Email, payload.Picture);
        }
        catch (InvalidJwtException)
        {
            throw Invalid("Google ID token không hợp lệ hoặc đã hết hạn.");
        }
    }

    private static UnauthorizedException Invalid(string message) => new(ErrorCodes.AuthGoogleTokenInvalid, message);
}
