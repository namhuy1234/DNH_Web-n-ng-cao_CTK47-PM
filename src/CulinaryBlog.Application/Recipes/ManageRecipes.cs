using CulinaryBlog.Application.Common;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Application.Recipes;

/// <summary>Một dòng trong bảng quản lý công thức.</summary>
public record ManagedRecipeDto(
    Guid Id, string Title, string Slug, RecipeStatus Status, bool IsDeleted, RecipeDifficulty Difficulty,
    string CategoryName, string AuthorId, string AuthorName, string? PrimaryImageUrl,
    DateTime CreatedAt, DateTime? UpdatedAt, DateTime? PublishedAt);

public record RecipeStatsDto(int Total, int Draft, int Published, int Archived, int Deleted);

/// <summary>Phạm vi xem: "mine" (bài của tôi) hoặc "all" (mọi tác giả, chỉ admin).</summary>
public static class RecipeScope
{
    public const string Mine = "mine";
    public const string All = "all";

    /// <summary>Trả về id tác giả cần lọc; null nghĩa là xem tất cả.</summary>
    public static string? ResolveAuthor(string scope, ICurrentUser currentUser)
    {
        if (scope != All) return currentUser.UserId;

        return currentUser.IsAdmin
            ? null
            : throw new ForbiddenException(ErrorCodes.RecipeForbidden,
                "Chỉ quản trị viên được xem công thức của mọi tác giả.");
    }
}

// ----- Danh sách quản lý: mọi trạng thái, kể cả đã xóa -----
public record GetManagedRecipesQuery(int Page, int PageSize, string? Status, string? Q, string Scope)
    : IRequest<PagedResult<ManagedRecipeDto>>;

public class GetManagedRecipesValidator : AbstractValidator<GetManagedRecipesQuery>
{
    public static readonly string[] Statuses = ["Draft", "Published", "Archived", "Deleted"];

    public GetManagedRecipesValidator()
    {
        RuleFor(x => x.Page).InclusiveBetween(1, 10_000).WithMessage("page phải từ 1 đến 10000.");
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50).WithMessage("pageSize phải từ 1 đến 50.");
        RuleFor(x => x.Status).Must(s => s is null || Statuses.Contains(s))
            .WithMessage($"status chỉ nhận: {string.Join(", ", Statuses)}.");
        RuleFor(x => x.Q).MaximumLength(100).WithMessage("Từ khóa tối đa 100 ký tự.");
        RuleFor(x => x.Scope).Must(s => s is RecipeScope.Mine or RecipeScope.All)
            .WithMessage("scope chỉ nhận: mine, all.");
    }
}

public class GetManagedRecipesHandler(IUnitOfWork unitOfWork, ICurrentUser currentUser, IUserReader users)
    : IRequestHandler<GetManagedRecipesQuery, PagedResult<ManagedRecipeDto>>
{
    public async Task<PagedResult<ManagedRecipeDto>> Handle(
        GetManagedRecipesQuery request, CancellationToken cancellationToken)
    {
        var deleted = request.Status == "Deleted";
        RecipeStatus? status = request.Status is null || deleted ? null : Enum.Parse<RecipeStatus>(request.Status);

        var filter = new ManageRecipeFilter(request.Page, request.PageSize, status, deleted, request.Q,
            RecipeScope.ResolveAuthor(request.Scope, currentUser));
        var (recipes, total) = await unitOfWork.Recipes.GetManagedPageAsync(filter, cancellationToken);
        var authors = await users.GetDisplayNamesAsync(recipes.Select(r => r.AuthorId), cancellationToken);

        var items = recipes.Select(r => new ManagedRecipeDto(
                r.Id, r.Title, r.Slug, r.Status, r.IsDeleted, r.Difficulty, r.Category.Name, r.AuthorId,
                authors.GetValueOrDefault(r.AuthorId, ""), r.Images.FirstOrDefault()?.OriginalUrl,
                r.CreatedAt, r.UpdatedAt, r.PublishedAt))
            .ToList();

        return new PagedResult<ManagedRecipeDto>(items, total, request.Page, request.PageSize);
    }
}

// ----- Thống kê số bài theo trạng thái -----
public record GetRecipeStatsQuery(string Scope) : IRequest<RecipeStatsDto>;

public class GetRecipeStatsValidator : AbstractValidator<GetRecipeStatsQuery>
{
    public GetRecipeStatsValidator()
        => RuleFor(x => x.Scope).Must(s => s is RecipeScope.Mine or RecipeScope.All)
            .WithMessage("scope chỉ nhận: mine, all.");
}

public class GetRecipeStatsHandler(IUnitOfWork unitOfWork, ICurrentUser currentUser)
    : IRequestHandler<GetRecipeStatsQuery, RecipeStatsDto>
{
    public async Task<RecipeStatsDto> Handle(GetRecipeStatsQuery request, CancellationToken cancellationToken)
    {
        var c = await unitOfWork.Recipes.CountByStatusAsync(
            RecipeScope.ResolveAuthor(request.Scope, currentUser), cancellationToken);
        return new RecipeStatsDto(c.Draft + c.Published + c.Archived, c.Draft, c.Published, c.Archived, c.Deleted);
    }
}

// ----- Lấy công thức theo id để sửa (mọi trạng thái) -----
public record GetRecipeForEditQuery(Guid Id) : IRequest<RecipeDetailDto>;

public class GetRecipeForEditHandler(RecipeDetailReader reader, RecipeAccess access)
    : IRequestHandler<GetRecipeForEditQuery, RecipeDetailDto>
{
    public async Task<RecipeDetailDto> Handle(GetRecipeForEditQuery request, CancellationToken cancellationToken)
    {
        var (recipe, dto) = await reader.ReadByIdAsync(request.Id, cancellationToken);
        return access.CanManage(recipe)
            ? dto
            : throw new ForbiddenException(ErrorCodes.RecipeForbidden, "Bạn không có quyền với công thức này.");
    }
}

// ----- Khôi phục công thức đã xóa mềm (về bản nháp) -----
public record RestoreRecipeCommand(Guid Id) : IRequest<RecipeDetailDto>;

public class RestoreRecipeHandler(
    IUnitOfWork unitOfWork, RecipeAccess access, RecipeDetailReader reader, ILogger<RestoreRecipeHandler> logger)
    : IRequestHandler<RestoreRecipeCommand, RecipeDetailDto>
{
    public async Task<RecipeDetailDto> Handle(RestoreRecipeCommand request, CancellationToken cancellationToken)
    {
        var recipe = await unitOfWork.Recipes.GetDeletedAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(ErrorCodes.RecipeNotFound, "Không tìm thấy công thức đã xóa.");
        if (!access.CanManage(recipe))
            throw new ForbiddenException(ErrorCodes.RecipeForbidden, "Bạn không có quyền với công thức này.");
        // Bài thuộc danh mục đã bị xóa: khôi phục sẽ tạo "bài ma" (không hiện ở danh sách nào) nên chặn lại.
        if (await unitOfWork.Categories.GetByIdAsync(recipe.CategoryId, cancellationToken) is null)
            throw new BusinessRuleException(ErrorCodes.CategoryNotFound,
                "Danh mục của công thức đã bị xóa nên chưa khôi phục được.");

        // Khôi phục về bản nháp để tác giả xem lại trước khi đăng lại.
        recipe.IsDeleted = false;
        recipe.Unpublish();
        recipe.Touch();
        await unitOfWork.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Khôi phục công thức {RecipeId} ({Slug}) về bản nháp", recipe.Id, recipe.Slug);

        return (await reader.ReadByIdAsync(recipe.Id, cancellationToken)).Dto;
    }
}
