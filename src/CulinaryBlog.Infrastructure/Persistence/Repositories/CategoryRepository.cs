using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Infrastructure.Persistence.Repositories;

public class CategoryRepository(CulinaryBlogDbContext db) : Repository<Category>(db), ICategoryRepository
{
    public async Task<IReadOnlyList<CategoryWithRecipeCount>> GetAllWithRecipeCountAsync(
        CancellationToken cancellationToken = default)
        => await Set.AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryWithRecipeCount(c, c.Recipes.Count(r => r.Status == RecipeStatus.Published)))
            .ToListAsync(cancellationToken);

    // Query filter loại danh mục đã xóa mềm, khớp với index unique có điều kiện.
    public Task<bool> NameExistsAsync(string name, Guid? excludeId = null, CancellationToken cancellationToken = default)
        => Set.AnyAsync(c => c.Id != excludeId && c.Name.ToLower() == name.ToLower(), cancellationToken);

    public Task<Category?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
        => Set.AsNoTracking().FirstOrDefaultAsync(c => c.Slug == slug, cancellationToken);

    // Đếm cả bài trong mục Đã xóa: bài đó còn khôi phục được nên danh mục phải còn tồn tại,
    // nếu không bài khôi phục xong sẽ trỏ tới danh mục đã xóa và biến mất khỏi mọi danh sách.
    public Task<int> CountRecipesAsync(Guid categoryId, CancellationToken cancellationToken = default)
        => Db.Recipes.IgnoreQueryFilters().CountAsync(r => r.CategoryId == categoryId, cancellationToken);

    public Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken = default)
        => Set.AnyAsync(c => c.Slug == slug, cancellationToken);
}
