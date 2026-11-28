using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;

namespace CulinaryBlog.Domain.Repositories;

/// <summary>ViewerId và ViewerIsAdmin quyết định có thấy bản nháp, lưu trữ hay không.</summary>
public record RecipeFilter(
    int Page, int PageSize, Guid? CategoryId, RecipeDifficulty? Difficulty,
    int? MaxCookTime, int? MinServings, string Sort, string? ViewerId = null, bool ViewerIsAdmin = false);

/// <summary>Bộ lọc trang quản lý. AuthorId null nghĩa là xem bài của mọi tác giả (chỉ admin).</summary>
public record ManageRecipeFilter(
    int Page, int PageSize, RecipeStatus? Status, bool Deleted, string? Keyword, string? AuthorId);

public record RecipeStatusCounts(int Draft, int Published, int Archived, int Deleted);

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

    Task<Recipe?> GetDetailByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Danh sách cho trang quản lý: mọi trạng thái, kể cả bài đã xóa mềm khi Deleted = true.</summary>
    Task<(IReadOnlyList<Recipe> Items, int TotalCount)> GetManagedPageAsync(
        ManageRecipeFilter filter, CancellationToken cancellationToken = default);

    Task<RecipeStatusCounts> CountByStatusAsync(string? authorId, CancellationToken cancellationToken = default);

    /// <summary>Công thức đã xóa mềm (không nạp thành phần con), để khôi phục.</summary>
    Task<Recipe?> GetDeletedAsync(Guid id, CancellationToken cancellationToken = default);

    Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken = default);
}
