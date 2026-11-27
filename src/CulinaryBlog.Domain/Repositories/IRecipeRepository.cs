using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;

namespace CulinaryBlog.Domain.Repositories;

public record RecipeFilter(int Page, int PageSize, Guid? CategoryId, RecipeDifficulty? Difficulty, string Sort);

public interface IRecipeRepository : IRepository<Recipe>
{
    Task<(IReadOnlyList<Recipe> Items, int TotalCount)> GetPublishedPageAsync(
        RecipeFilter filter, CancellationToken cancellationToken = default);

    Task<Recipe?> GetDetailBySlugAsync(string slug, CancellationToken cancellationToken = default);
}
