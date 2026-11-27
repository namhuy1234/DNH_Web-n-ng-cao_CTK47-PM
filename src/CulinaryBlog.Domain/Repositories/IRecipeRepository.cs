using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;

namespace CulinaryBlog.Domain.Repositories;

/// <summary>ViewerId và ViewerIsAdmin quyết định có thấy bản nháp, lưu trữ hay không.</summary>
public record RecipeFilter(
    int Page, int PageSize, Guid? CategoryId, RecipeDifficulty? Difficulty,
    int? MaxCookTime, int? MinServings, string Sort, string? ViewerId = null, bool ViewerIsAdmin = false);

public interface IRecipeRepository : IRepository<Recipe>
{
    Task<(IReadOnlyList<Recipe> Items, int TotalCount)> GetPageAsync(
        RecipeFilter filter, CancellationToken cancellationToken = default);

    /// <summary>Tìm kiếm toàn văn trên các công thức đã công khai.</summary>
    Task<(IReadOnlyList<Recipe> Items, int TotalCount)> SearchAsync(
        string tsQuery, RecipeFilter filter, CancellationToken cancellationToken = default);

    Task<Recipe?> GetDetailBySlugAsync(string slug, CancellationToken cancellationToken = default);

    /// <summary>Nạp công thức kèm thành phần con để chỉnh sửa (có theo dõi thay đổi).</summary>
    Task<Recipe?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken = default);

    Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken = default);
}
