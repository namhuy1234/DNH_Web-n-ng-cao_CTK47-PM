using CulinaryBlog.Domain.Entities;

namespace CulinaryBlog.Domain.Repositories;

public record CategoryWithRecipeCount(Category Category, int RecipeCount);

public interface ICategoryRepository : IRepository<Category>
{
    Task<IReadOnlyList<CategoryWithRecipeCount>> GetAllWithRecipeCountAsync(CancellationToken cancellationToken = default);
    Task<bool> NameExistsAsync(string name, CancellationToken cancellationToken = default);
    Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken = default);
}
