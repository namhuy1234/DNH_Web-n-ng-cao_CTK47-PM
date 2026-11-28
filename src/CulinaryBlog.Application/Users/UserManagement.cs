using CulinaryBlog.Application.Common;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Application.Users;

public record UserListItemDto(
    string Id, string Email, string DisplayName, string? AvatarUrl, IReadOnlyList<string> Roles,
    bool IsActive, bool IsLockedOut, DateTime CreatedAt, int RecipeCount, int PublishedCount);

/// <summary>Role: "Admin" | "Author"; Status: "active" | "locked".</summary>
public record UserListFilter(int Page, int PageSize, string? Role, string? Keyword, string? Status);

/// <summary>Truy vấn và cập nhật tài khoản cho trang quản trị (cài đặt bằng ASP.NET Identity ở Infrastructure).</summary>
public interface IUserAdminService
{
    Task<(IReadOnlyList<UserListItemDto> Items, int TotalCount)> GetPageAsync(
        UserListFilter filter, CancellationToken cancellationToken);

    Task<UserListItemDto?> GetAsync(string userId, CancellationToken cancellationToken);

    Task SetActiveAsync(string userId, bool active, CancellationToken cancellationToken);
}

/// <summary>
/// Danh sách người dùng bị khóa mà access token (JWT, sống 15 phút) vẫn còn hạn.
/// API kiểm tra danh sách này ở mỗi request để khóa có hiệu lực ngay.
/// </summary>
public interface IAccessBlocklist
{
    void Block(string userId);
    void Unblock(string userId);
    bool IsBlocked(string userId);
}

// ----- Danh sách người dùng (Admin) -----
public record GetUsersQuery(int Page, int PageSize, string? Role, string? Q, string? Status)
    : IRequest<PagedResult<UserListItemDto>>;

public class GetUsersValidator : AbstractValidator<GetUsersQuery>
{
    public GetUsersValidator()
    {
        RuleFor(x => x.Page).InclusiveBetween(1, 10_000).WithMessage("page phải từ 1 đến 10000.");
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50).WithMessage("pageSize phải từ 1 đến 50.");
        RuleFor(x => x.Role).Must(r => r is null or "Admin" or "Author").WithMessage("role chỉ nhận: Admin, Author.");
        RuleFor(x => x.Status).Must(s => s is null or "active" or "locked").WithMessage("status chỉ nhận: active, locked.");
        RuleFor(x => x.Q).MaximumLength(100).WithMessage("Từ khóa tối đa 100 ký tự.");
    }
}

public class GetUsersHandler(IUserAdminService users) : IRequestHandler<GetUsersQuery, PagedResult<UserListItemDto>>
{
    public async Task<PagedResult<UserListItemDto>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        var (items, total) = await users.GetPageAsync(
            new UserListFilter(request.Page, request.PageSize, request.Role, request.Q, request.Status), cancellationToken);
        return new PagedResult<UserListItemDto>(items, total, request.Page, request.PageSize);
    }
}

// ----- Khóa / mở khóa tài khoản (Admin) -----
public record SetUserActiveCommand(string UserId, bool Active) : IRequest<UserListItemDto>;

public class SetUserActiveHandler(
    IUserAdminService users, IRefreshTokenRepository refreshTokens, IAccessBlocklist blocklist,
    ICurrentUser currentUser, ILogger<SetUserActiveHandler> logger)
    : IRequestHandler<SetUserActiveCommand, UserListItemDto>
{
    public async Task<UserListItemDto> Handle(SetUserActiveCommand request, CancellationToken cancellationToken)
    {
        var target = await users.GetAsync(request.UserId, cancellationToken)
            ?? throw new NotFoundException(ErrorCodes.UserNotFound, "Không tìm thấy tài khoản.");

        if (!request.Active)
        {
            if (target.Id == currentUser.UserId)
                throw new BusinessRuleException(ErrorCodes.UserLockForbidden, "Không thể tự khóa tài khoản của mình.");
            // Tránh việc các quản trị viên khóa lẫn nhau làm hệ thống mất người quản lý.
            if (target.Roles.Contains("Admin"))
                throw new BusinessRuleException(ErrorCodes.UserLockForbidden, "Không thể khóa tài khoản quản trị viên.");
        }

        await users.SetActiveAsync(target.Id, request.Active, cancellationToken);

        if (request.Active)
        {
            blocklist.Unblock(target.Id);
            logger.LogWarning("Quản trị viên {AdminId} mở khóa tài khoản {TargetId}", currentUser.UserId, target.Id);
        }
        else
        {
            // Thu hồi mọi phiên: refresh token hết dùng được, access token bị chặn ngay.
            await refreshTokens.RevokeAllAsync(target.Id, cancellationToken);
            blocklist.Block(target.Id);
            logger.LogWarning("Quản trị viên {AdminId} khóa tài khoản {TargetId}", currentUser.UserId, target.Id);
        }

        return (await users.GetAsync(target.Id, cancellationToken))!;
    }
}
