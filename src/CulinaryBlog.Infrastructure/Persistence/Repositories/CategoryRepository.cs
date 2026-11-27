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

    // Index unique tính cả bản ghi đã xóa mềm nên phải bỏ query filter khi kiểm tra trùng.
    public Task<bool> NameExistsAsync(string name, Guid? excludeId = null, CancellationToken cancellationToken = default)
        => Set.IgnoreQueryFilters()
            .AnyAsync(c => c.Id != excludeId && c.Name.ToLower() == name.ToLower(), cancellationToken);

    public Task<Category?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
        => Set.AsNoTracking().FirstOrDefaultAsync(c => c.Slug == slug, cancellationToken);

    public Task<int> CountRecipesAsync(Guid categoryId, CancellationToken cancellationToken = default)
        => Db.Recipes.CountAsync(r => r.CategoryId == categoryId, cancellationToken);

    public Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken = default)
        => Set.IgnoreQueryFilters().AnyAsync(c => c.Slug == slug, cancellationToken);
}
