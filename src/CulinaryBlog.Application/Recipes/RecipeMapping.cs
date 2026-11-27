using CulinaryBlog.Application.Common;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;

namespace CulinaryBlog.Application.Recipes;

public static class RecipeMapping
{
    public static IngredientDto ToDto(this RecipeIngredient i)
        => new(i.Id, i.Name, i.Quantity, i.Unit, i.Notes, i.OrderIndex);

    public static StepDto ToDto(this RecipeStep s)
        => new(s.Id, s.StepNumber, s.Title, s.Description, s.TimerMinutes, s.ImageUrl);

    public static ImageDto ToDto(this RecipeImage i)
        => new(i.Id, i.OriginalUrl, i.AltText, i.IsPrimary, i.OrderIndex);
}

public class RecipeSummaryMapper(IUserReader users)
{
    public async Task<IReadOnlyList<RecipeSummaryDto>> MapAsync(
        IReadOnlyList<Recipe> recipes, CancellationToken cancellationToken)
    {
        var authors = await users.GetDisplayNamesAsync(recipes.Select(r => r.AuthorId), cancellationToken);

        return recipes.Select(r => new RecipeSummaryDto(
                r.Id, r.Title, r.Slug, r.Description, r.PrepTime, r.CookTime, r.Servings, r.Difficulty, r.Status,
                r.Category.Name, authors.GetValueOrDefault(r.AuthorId, ""),
                r.Images.FirstOrDefault(i => i.IsPrimary)?.OriginalUrl, r.CreatedAt))
            .ToList();
    }
}

/// <summary>Đọc lại công thức và tạo DTO chi tiết.</summary>
public class RecipeDetailReader(IUnitOfWork unitOfWork, IUserReader users)
{
    public async Task<(Recipe Recipe, RecipeDetailDto Dto)> ReadAsync(string slug, CancellationToken cancellationToken)
    {
        var r = await unitOfWork.Recipes.GetDetailBySlugAsync(slug, cancellationToken)
            ?? throw new NotFoundException(ErrorCodes.RecipeNotFound, $"Không tìm thấy công thức '{slug}'.");
        var authors = await users.GetDisplayNamesAsync([r.AuthorId], cancellationToken);
        var n = r.Nutrition;

        return (r, new RecipeDetailDto(
            r.Id, r.Title, r.Slug, r.Description, r.Instructions, r.PrepTime, r.CookTime, r.Servings,
            r.Difficulty, r.Status, r.PublishedAt, r.CategoryId, r.Category.Name, r.Category.Slug,
            r.AuthorId, authors.GetValueOrDefault(r.AuthorId, ""), Convert.ToBase64String(r.RowVersion),
            n is null ? null : new NutritionDto(n.Calories, n.Protein, n.Carbohydrates, n.Fat, n.Fiber, n.Sodium),
            r.Ingredients.OrderBy(i => i.OrderIndex).Select(i => i.ToDto()).ToList(),
            r.Steps.OrderBy(s => s.StepNumber).Select(s => s.ToDto()).ToList(),
            r.Images.OrderBy(i => i.OrderIndex).Select(i => i.ToDto()).ToList()));
    }
}

/// <summary>Resource-based authorization: chỉ tác giả của công thức hoặc admin được sửa.</summary>
public class RecipeAccess(IUnitOfWork unitOfWork, ICurrentUser currentUser)
{
    public bool CanManage(Recipe recipe)
        => currentUser.IsAdmin || (currentUser.UserId is not null && recipe.AuthorId == currentUser.UserId);

    public async Task<Recipe> GetOwnedAsync(Guid id, CancellationToken cancellationToken)
    {
        var recipe = await unitOfWork.Recipes.GetForUpdateAsync(id, cancellationToken)
            ?? throw new NotFoundException(ErrorCodes.RecipeNotFound, "Không tìm thấy công thức.");

        return CanManage(recipe)
            ? recipe
            : throw new ForbiddenException(ErrorCodes.RecipeForbidden, "Bạn không có quyền với công thức này.");
    }
}
