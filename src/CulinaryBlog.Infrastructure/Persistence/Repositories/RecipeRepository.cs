using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Infrastructure.Persistence.Repositories;

public class RecipeRepository(CulinaryBlogDbContext db) : Repository<Recipe>(db), IRecipeRepository
{
    public async Task<(IReadOnlyList<Recipe> Items, int TotalCount)> GetPublishedPageAsync(
        RecipeFilter filter, CancellationToken cancellationToken = default)
    {
        var query = Set.AsNoTracking().Where(r => r.Status == RecipeStatus.Published);

        if (filter.CategoryId is { } categoryId)
            query = query.Where(r => r.CategoryId == categoryId);
        if (filter.Difficulty is { } difficulty)
            query = query.Where(r => r.Difficulty == difficulty);

        var total = await query.CountAsync(cancellationToken);

        var ordered = filter.Sort switch
        {
            "createdAt" => query.OrderBy(r => r.CreatedAt),
            "title" => query.OrderBy(r => r.Title),
            "-title" => query.OrderByDescending(r => r.Title),
            "cookTime" => query.OrderBy(r => r.CookTime),
            "-cookTime" => query.OrderByDescending(r => r.CookTime),
            _ => query.OrderByDescending(r => r.CreatedAt)
        };

        var items = await ordered.ThenBy(r => r.Id)
            .Include(r => r.Category)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        return (items, total);
    }

    // AsSplitQuery: tránh Cartesian explosion khi Include nhiều collection.
    public Task<Recipe?> GetDetailBySlugAsync(string slug, CancellationToken cancellationToken = default)
        => Set.AsNoTracking()
            .Include(r => r.Category)
            .Include(r => r.Ingredients.OrderBy(i => i.OrderIndex))
            .Include(r => r.Steps.OrderBy(s => s.StepNumber))
            .Include(r => r.Images.OrderBy(i => i.OrderIndex))
            .AsSplitQuery()
            .FirstOrDefaultAsync(r => r.Slug == slug, cancellationToken);
}
