using CulinaryBlog.Application.Auth;
using CulinaryBlog.Domain.Exceptions;
using Microsoft.AspNetCore.Identity;

namespace CulinaryBlog.Infrastructure.Identity;

public class IdentityService(UserManager<ApplicationUser> users) : IIdentityService
{
    private const string WrongCredentials = "Email hoặc mật khẩu không đúng.";

    public async Task<UserProfileDto> RegisterAsync(string email, string password, string displayName)
    {
        if (await users.FindByEmailAsync(email) is not null)
            throw new ConflictException(ErrorCodes.AuthEmailExists, "Email đã được đăng ký.");

        var user = new ApplicationUser
        {
            UserName = email, Email = email, DisplayName = displayName, CreatedAt = DateTime.UtcNow
        };
        Ensure(await users.CreateAsync(user, password));
        Ensure(await users.AddToRoleAsync(user, "Author"));

        return await ToProfileAsync(user);
    }

    public async Task<UserProfileDto> ValidateCredentialsAsync(string email, string password)
    {
        var user = await users.FindByEmailAsync(email)
            ?? throw new UnauthorizedException(ErrorCodes.AuthInvalidCredentials, WrongCredentials);

        if (await users.IsLockedOutAsync(user))
            throw Locked(user);

        if (!await users.CheckPasswordAsync(user, password))
        {
            // Sai 5 lần thì khóa 15 phút (cấu hình ở AddIdentityCore).
            await users.AccessFailedAsync(user);
            if (await users.IsLockedOutAsync(user))
                throw Locked(user);

            throw new UnauthorizedException(ErrorCodes.AuthInvalidCredentials, WrongCredentials);
        }

        EnsureActive(user);
        await users.ResetAccessFailedCountAsync(user);

        return await ToProfileAsync(user);
    }

    public async Task<UserProfileDto> FindOrCreateExternalAsync(GoogleUserInfo info)
    {
        var user = await users.FindByLoginAsync("Google", info.ProviderKey);

        if (user is null)
        {
            user = await users.FindByEmailAsync(info.Email);
            if (user is null)
            {
                user = new ApplicationUser
                {
                    UserName = info.Email, Email = info.Email, EmailConfirmed = true,
                    DisplayName = info.DisplayName.Length > 100 ? info.DisplayName[..100] : info.DisplayName,
                    AvatarUrl = info.AvatarUrl, CreatedAt = DateTime.UtcNow
                };
                Ensure(await users.CreateAsync(user));
                Ensure(await users.AddToRoleAsync(user, "Author"));
            }
            else if (!user.EmailConfirmed)
            {
                // Email chưa xác nhận có thể do người khác đăng ký trước: bỏ mật khẩu cũ khi liên kết.
                if (await users.HasPasswordAsync(user))
                    Ensure(await users.RemovePasswordAsync(user));
                user.EmailConfirmed = true;
                Ensure(await users.UpdateAsync(user));
            }

            Ensure(await users.AddLoginAsync(user, new UserLoginInfo("Google", info.ProviderKey, "Google")));
        }

        await EnsureCanSignInAsync(user.Id);
        return await ToProfileAsync(user);
    }

    public async Task<UserProfileDto?> GetProfileAsync(string userId)
    {
        var user = await users.FindByIdAsync(userId);
        return user is null ? null : await ToProfileAsync(user);
    }

    public async Task EnsureCanSignInAsync(string userId)
    {
        var user = await users.FindByIdAsync(userId)
            ?? throw new UnauthorizedException(ErrorCodes.AuthInvalidCredentials, "Tài khoản không còn tồn tại.");

        EnsureActive(user);
        if (await users.IsLockedOutAsync(user))
            throw Locked(user);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(
        string userId, string? displayName, string? avatarUrl, string? bio)
    {
        var user = await users.FindByIdAsync(userId)
            ?? throw new NotFoundException(ErrorCodes.UserNotFound, "Không tìm thấy tài khoản.");

        // PATCH: chỉ đổi trường được gửi lên; chuỗi rỗng nghĩa là xóa giá trị.
        if (displayName is not null) user.DisplayName = displayName;
        if (avatarUrl is not null) user.AvatarUrl = avatarUrl.Length == 0 ? null : avatarUrl;
        if (bio is not null) user.Bio = bio.Length == 0 ? null : bio;
        Ensure(await users.UpdateAsync(user));

        return await ToProfileAsync(user);
    }

    public async Task<(UserProfileDto Profile, string? OldAvatarUrl)> SetAvatarAsync(string userId, string avatarUrl)
    {
        var user = await users.FindByIdAsync(userId)
            ?? throw new NotFoundException(ErrorCodes.UserNotFound, "Không tìm thấy tài khoản.");

        var old = user.AvatarUrl;
        user.AvatarUrl = avatarUrl;
        Ensure(await users.UpdateAsync(user));
        return (await ToProfileAsync(user), old);
    }

    public async Task ChangePasswordAsync(string userId, string currentPassword, string newPassword)
    {
        var user = await users.FindByIdAsync(userId)
            ?? throw new NotFoundException(ErrorCodes.UserNotFound, "Không tìm thấy tài khoản.");

        // Tài khoản tạo bằng Google chưa có mật khẩu: không có gì để đổi.
        if (!await users.HasPasswordAsync(user))
            throw new BadRequestException(ErrorCodes.AuthWrongPassword, "Tài khoản đăng nhập bằng Google chưa có mật khẩu.");

        var result = await users.ChangePasswordAsync(user, currentPassword, newPassword);
        if (result.Errors.Any(e => e.Code == "PasswordMismatch"))
            throw new BadRequestException(ErrorCodes.AuthWrongPassword, "Mật khẩu hiện tại không đúng.");
        Ensure(result);
    }

    public async Task<(string Token, string DisplayName)?> CreatePasswordResetTokenAsync(string email)
    {
        var user = await users.FindByEmailAsync(email);
        if (user is null || !user.IsActive || !await users.HasPasswordAsync(user)) return null;

        return (await users.GeneratePasswordResetTokenAsync(user), user.DisplayName);
    }

    public async Task<string> ResetPasswordAsync(string email, string token, string newPassword)
    {
        var invalid = new BadRequestException(ErrorCodes.AuthResetTokenInvalid,
            "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy gửi yêu cầu mới.");

        var user = await users.FindByEmailAsync(email);
        if (user is null || !user.IsActive) throw invalid;

        var result = await users.ResetPasswordAsync(user, token, newPassword);
        if (result.Errors.Any(e => e.Code == "InvalidToken")) throw invalid;
        Ensure(result);

        // Người dùng chứng minh được quyền với email: mở khóa nếu đang bị khóa do sai mật khẩu.
        await users.SetLockoutEndDateAsync(user, null);
        await users.ResetAccessFailedCountAsync(user);
        return user.Id;
    }

    private async Task<UserProfileDto> ToProfileAsync(ApplicationUser user)
        => new(user.Id, user.Email!, user.DisplayName, user.AvatarUrl, user.Bio,
            (await users.GetRolesAsync(user)).ToList(), user.EmailConfirmed, user.CreatedAt);

    private static void EnsureActive(ApplicationUser user)
    {
        if (!user.IsActive)
            throw new ForbiddenException(ErrorCodes.AuthAccountDisabled, "Tài khoản đã bị vô hiệu hóa.");
    }

    private static LockedException Locked(ApplicationUser user)
    {
        var minutes = Math.Max(1, (int)Math.Ceiling(((user.LockoutEnd ?? DateTimeOffset.UtcNow) - DateTimeOffset.UtcNow).TotalMinutes));
        return new LockedException(ErrorCodes.AuthAccountLocked, $"Tài khoản bị khóa, thử lại sau {minutes} phút.");
    }

    private static void Ensure(IdentityResult result)
    {
        if (result.Succeeded) return;

        if (result.Errors.Any(e => e.Code is "DuplicateEmail" or "DuplicateUserName"))
            throw new ConflictException(ErrorCodes.AuthEmailExists, "Email đã được đăng ký.");

        throw new BusinessRuleException(ErrorCodes.ValidationError, string.Join(" ", result.Errors.Select(e => e.Description)));
    }
}
