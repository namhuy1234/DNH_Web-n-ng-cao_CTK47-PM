using CulinaryBlog.Application.Common;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Auth;

// ----- Đăng ký (FR-AUTH-001) -----
public record RegisterCommand(string Email, string Password, string DisplayName) : IRequest<AuthResponseDto>;

public class RegisterValidator : AbstractValidator<RegisterCommand>
{
    public RegisterValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256).WithMessage("Email không hợp lệ.");
        RuleFor(x => x.Password).StrongPassword();
        RuleFor(x => (x.DisplayName ?? string.Empty).Trim())
            .Length(2, 100).WithMessage("Tên hiển thị dài từ 2 đến 100 ký tự.")
            .OverridePropertyName(nameof(RegisterCommand.DisplayName));
    }
}

public class RegisterHandler(IIdentityService identity, SessionIssuer sessions, IAuthEmailService emails)
    : IRequestHandler<RegisterCommand, AuthResponseDto>
{
    public async Task<AuthResponseDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var user = await identity.RegisterAsync(request.Email.Trim(), request.Password, request.DisplayName.Trim());
        // Email đi qua hàng đợi chạy nền nên không làm chậm việc đăng ký.
        await emails.SendWelcomeAsync(user.Email, user.DisplayName, cancellationToken);
        return await sessions.IssueAsync(user, cancellationToken);
    }
}

// ----- Đăng nhập (FR-AUTH-002) -----
public record LoginCommand(string Email, string Password) : IRequest<AuthResponseDto>;

public class LoginValidator : AbstractValidator<LoginCommand>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("Email không hợp lệ.");
        RuleFor(x => x.Password).NotEmpty().WithMessage("Mật khẩu không được để trống.");
    }
}

public class LoginHandler(IIdentityService identity, SessionIssuer sessions)
    : IRequestHandler<LoginCommand, AuthResponseDto>
{
    public async Task<AuthResponseDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await identity.ValidateCredentialsAsync(request.Email.Trim(), request.Password);
        return await sessions.IssueAsync(user, cancellationToken);
    }
}

// ----- Đăng nhập Google (FR-AUTH-003) -----
public record GoogleLoginCommand(string IdToken) : IRequest<AuthResponseDto>;

public class GoogleLoginValidator : AbstractValidator<GoogleLoginCommand>
{
    public GoogleLoginValidator() => RuleFor(x => x.IdToken).NotEmpty().WithMessage("Thiếu idToken.");
}

public class GoogleLoginHandler(IGoogleTokenVerifier google, IIdentityService identity, SessionIssuer sessions)
    : IRequestHandler<GoogleLoginCommand, AuthResponseDto>
{
    public async Task<AuthResponseDto> Handle(GoogleLoginCommand request, CancellationToken cancellationToken)
    {
        var info = await google.VerifyAsync(request.IdToken);
        var user = await identity.FindOrCreateExternalAsync(info);
        return await sessions.IssueAsync(user, cancellationToken);
    }
}

// ----- Làm mới token (FR-AUTH-004) -----
public record RefreshTokenCommand(string RefreshToken) : IRequest<AuthResponseDto>;

public class RefreshTokenValidator : AbstractValidator<RefreshTokenCommand>
{
    public RefreshTokenValidator() => RuleFor(x => x.RefreshToken).NotEmpty().WithMessage("Thiếu refreshToken.");
}

public class RefreshTokenHandler(
    ITokenService tokens, IRefreshTokenRepository refreshTokens, IIdentityService identity, SessionIssuer sessions)
    : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
{
    public async Task<AuthResponseDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var stored = await refreshTokens.GetByHashAsync(tokens.Hash(request.RefreshToken), cancellationToken)
            ?? throw new UnauthorizedException(ErrorCodes.AuthRefreshTokenInvalid, "Refresh token không hợp lệ.");

        if (stored.RevokedAt is null && stored.ExpiresAt <= DateTime.UtcNow)
            throw new UnauthorizedException(ErrorCodes.AuthRefreshTokenExpired, "Refresh token đã hết hạn.");

        // Token đã bị thu hồi (đăng xuất, đổi mật khẩu, bị khóa) mà vẫn gửi lại: 401, thu hồi toàn bộ phòng bị lộ.
        if (stored.RevokedAt is not null)
        {
            await refreshTokens.RevokeAllAsync(stored.UserId, cancellationToken);
            throw new UnauthorizedException(ErrorCodes.AuthRefreshTokenRevoked, "Refresh token đã bị thu hồi.");
        }

        var user = await identity.GetProfileAsync(stored.UserId)
            ?? throw new UnauthorizedException(ErrorCodes.AuthRefreshTokenInvalid, "Tài khoản không còn tồn tại.");
        await identity.EnsureCanSignInAsync(user.Id);

        var next = tokens.CreateRefreshToken();
        if (!await refreshTokens.TryRevokeAsync(stored.Id, tokens.Hash(next), cancellationToken))
        {
            // Token đã dùng rồi mà bị gửi lại: coi như bị lộ, thu hồi toàn bộ.
            await refreshTokens.RevokeAllAsync(stored.UserId, cancellationToken);
            throw new UnauthorizedException(ErrorCodes.AuthRefreshTokenRevoked, "Refresh token đã bị thu hồi.");
        }

        return await sessions.IssueAsync(user, cancellationToken, next);
    }
}

// ----- Đăng xuất (FR-AUTH-005) -----
public record LogoutCommand(string RefreshToken) : IRequest;

public class LogoutValidator : AbstractValidator<LogoutCommand>
{
    public LogoutValidator() => RuleFor(x => x.RefreshToken).NotEmpty().WithMessage("Thiếu refreshToken.");
}

public class LogoutHandler(ITokenService tokens, IRefreshTokenRepository refreshTokens, ICurrentUser currentUser)
    : IRequestHandler<LogoutCommand>
{
    public async Task Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        var stored = await refreshTokens.GetByHashAsync(tokens.Hash(request.RefreshToken), cancellationToken);

        // Không tìm thấy hoặc của người khác vẫn trả 204, không tiết lộ gì.
        if (stored is not null && stored.UserId == currentUser.UserId)
            await refreshTokens.TryRevokeAsync(stored.Id, null, cancellationToken);
    }
}

// ----- Hồ sơ cá nhân (FR-AUTH-006, 007) -----
public record GetMyProfileQuery : IRequest<UserProfileDto>;

public class GetMyProfileHandler(IIdentityService identity, ICurrentUser currentUser)
    : IRequestHandler<GetMyProfileQuery, UserProfileDto>
{
    public async Task<UserProfileDto> Handle(GetMyProfileQuery request, CancellationToken cancellationToken)
        => await identity.GetProfileAsync(currentUser.UserId!)
           ?? throw new NotFoundException(ErrorCodes.UserNotFound, "Không tìm thấy tài khoản.");
}

public record UpdateProfileCommand(string? DisplayName, string? AvatarUrl, string? Bio) : IRequest<UserProfileDto>;

public class UpdateProfileValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileValidator()
    {
        RuleFor(x => x.DisplayName!.Trim())
            .Length(2, 100).WithMessage("Tên hiển thị dài từ 2 đến 100 ký tự.")
            .OverridePropertyName(nameof(UpdateProfileCommand.DisplayName))
            .When(x => x.DisplayName is not null);
        RuleFor(x => x.AvatarUrl)
            .MaximumLength(500)
            .Must(url => AvatarRules.IsUploaded(url!) ||
                         (Uri.TryCreate(url, UriKind.Absolute, out var uri) && (uri.Scheme == "http" || uri.Scheme == "https")))
            .WithMessage("avatarUrl phải là địa chỉ http/https hoặc ảnh đã tải lên.")
            .When(x => !string.IsNullOrEmpty(x.AvatarUrl));
        RuleFor(x => x.Bio).MaximumLength(1000).WithMessage("Tiểu sử tối đa 1000 ký tự.");
    }
}

public class UpdateProfileHandler(IIdentityService identity, ICurrentUser currentUser)
    : IRequestHandler<UpdateProfileCommand, UserProfileDto>
{
    public Task<UserProfileDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
        => identity.UpdateProfileAsync(
            currentUser.UserId!, request.DisplayName?.Trim(), request.AvatarUrl, request.Bio);
}
