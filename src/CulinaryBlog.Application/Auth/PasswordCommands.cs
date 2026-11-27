using CulinaryBlog.Application.Common;
using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Auth;

public static class PasswordRules
{
    /// <summary>Quy tắc mật khẩu dùng chung (NFR-SEC-001): 8–100 ký tự, có hoa, thường, số, ký tự đặc biệt.</summary>
    public static IRuleBuilderOptions<T, string> StrongPassword<T>(this IRuleBuilderInitial<T, string> rule) => rule
        .Cascade(CascadeMode.Stop)
        .NotEmpty().WithMessage("Mật khẩu không được để trống.")
        .Length(8, 100).WithMessage("Mật khẩu dài từ 8 đến 100 ký tự.")
        .Matches("[A-Z]").WithMessage("Mật khẩu cần ít nhất 1 chữ hoa.")
        .Matches("[a-z]").WithMessage("Mật khẩu cần ít nhất 1 chữ thường.")
        .Matches("[0-9]").WithMessage("Mật khẩu cần ít nhất 1 chữ số.")
        .Matches("[^a-zA-Z0-9]").WithMessage("Mật khẩu cần ít nhất 1 ký tự đặc biệt.");
}

// ----- Đổi mật khẩu (người dùng đã đăng nhập) -----
public record ChangePasswordCommand(string CurrentPassword, string NewPassword) : IRequest<AuthResponseDto>;

public class ChangePasswordValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("Nhập mật khẩu hiện tại.");
        RuleFor(x => x.NewPassword).StrongPassword();
        RuleFor(x => x.NewPassword)
            .NotEqual(x => x.CurrentPassword).WithMessage("Mật khẩu mới phải khác mật khẩu hiện tại.")
            .When(x => !string.IsNullOrEmpty(x.NewPassword));
    }
}

public class ChangePasswordHandler(
    IIdentityService identity, ICurrentUser currentUser, IRefreshTokenRepository refreshTokens, SessionIssuer sessions)
    : IRequestHandler<ChangePasswordCommand, AuthResponseDto>
{
    public async Task<AuthResponseDto> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId!;
        await identity.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);

        // Đăng xuất mọi thiết bị khác, cấp phiên mới cho thiết bị đang dùng.
        await refreshTokens.RevokeAllAsync(userId, cancellationToken);
        var user = await identity.GetProfileAsync(userId)
            ?? throw new Domain.Exceptions.NotFoundException(Domain.Exceptions.ErrorCodes.UserNotFound, "Không tìm thấy tài khoản.");
        return await sessions.IssueAsync(user, cancellationToken);
    }
}

// ----- Quên mật khẩu: gửi email chứa liên kết đặt lại -----
public record ForgotPasswordCommand(string Email) : IRequest;

public class ForgotPasswordValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordValidator() =>
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256).WithMessage("Email không hợp lệ.");
}

public class ForgotPasswordHandler(IIdentityService identity, IAuthEmailService emails)
    : IRequestHandler<ForgotPasswordCommand>
{
    public async Task Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var address = request.Email.Trim();
        var reset = await identity.CreatePasswordResetTokenAsync(address);

        // Email không tồn tại vẫn trả cùng một kết quả để không lộ ai đã đăng ký.
        if (reset is null) return;

        await emails.SendPasswordResetAsync(address, reset.Value.DisplayName, reset.Value.Token, cancellationToken);
    }
}

// ----- Đặt lại mật khẩu bằng token trong email -----
public record ResetPasswordCommand(string Email, string Token, string NewPassword) : IRequest;

public class ResetPasswordValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("Email không hợp lệ.");
        RuleFor(x => x.Token).NotEmpty().WithMessage("Thiếu mã đặt lại mật khẩu.");
        RuleFor(x => x.NewPassword).StrongPassword();
    }
}

public class ResetPasswordHandler(IIdentityService identity, IRefreshTokenRepository refreshTokens)
    : IRequestHandler<ResetPasswordCommand>
{
    public async Task Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var userId = await identity.ResetPasswordAsync(request.Email.Trim(), request.Token, request.NewPassword);
        // Mật khẩu có thể đã bị lộ: thu hồi mọi phiên đang đăng nhập.
        await refreshTokens.RevokeAllAsync(userId, cancellationToken);
    }
}
