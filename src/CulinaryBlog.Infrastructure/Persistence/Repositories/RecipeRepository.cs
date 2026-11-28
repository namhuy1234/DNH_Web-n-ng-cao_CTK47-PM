using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using NpgsqlTypes;

namespace CulinaryBlog.Infrastructure.Persistence.Repositories;

public class RecipeRepository(CulinaryBlogDbContext db) : Repository<Recipe>(db), IRecipeRepository
{
    public async Task<(IReadOnlyList<Recipe> Items, int TotalCount)> GetPageAsync(
        RecipeFilter filter, CancellationToken cancellationToken = default)
    {
        var query = Set.AsNoTracking();

        // Khách chỉ thấy bài công khai; tác giả thấy thêm bài của mình; admin thấy tất cả.
        if (!filter.ViewerIsAdmin)
            query = query.Where(r => r.Status == RecipeStatus.Published || r.AuthorId == filter.ViewerId);

        query = ApplyFilter(query, filter);
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

        return (await PageAsync(ordered.ThenBy(r => r.Id), filter, cancellationToken), total);
    }

    public async Task<(IReadOnlyList<Recipe> Items, int TotalCount)> SearchAsync(
        string tsQuery, RecipeFilter filter, CancellationToken cancellationToken = default)
    {
        var query = ApplyFilter(Set.AsNoTracking().Where(r => r.Status == RecipeStatus.Published), filter)
            .Where(r => EF.Property<NpgsqlTsVector>(r, "SearchVector")
                .Matches(EF.Functions.ToTsQuery("simple", tsQuery)));

        var total = await query.CountAsync(cancellationToken);

        var ordered = query
            .OrderByDescending(r => EF.Property<NpgsqlTsVector>(r, "SearchVector")
                .Rank(EF.Functions.ToTsQuery("simple", tsQuery)))
            .ThenBy(r => r.Id);

        return (await PageAsync(ordered, filter, cancellationToken), total);
    }

    // AsSplitQuery: tránh Cartesian explosion khi Include nhiều collection.
    public Task<Recipe?> GetDetailBySlugAsync(string slug, CancellationToken cancellationToken = default)
        => WithChildren(Set.AsNoTracking()).FirstOrDefaultAsync(r => r.Slug == slug, cancellationToken);

    public Task<Recipe?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken = default)
        => WithChildren(Set).FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public Task<Recipe?> GetDetailByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => WithChildren(Set.AsNoTracking()).FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public async Task<(IReadOnlyList<Recipe> Items, int TotalCount)> GetManagedPageAsync(
        ManageRecipeFilter filter, CancellationToken cancellationToken = default)
    {
        // Bài đã xóa mềm bị query filter ẩn đi nên phải bỏ filter rồi tự lọc lại.
        var query = filter.Deleted
            ? Set.IgnoreQueryFilters().AsNoTracking().Where(r => r.IsDeleted)
            : Set.AsNoTracking();

        if (filter.AuthorId is not null) query = query.Where(r => r.AuthorId == filter.AuthorId);
        if (filter.Status is { } status) query = query.Where(r => r.Status == status);
        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            // Thoát ký tự đặc biệt của LIKE để người dùng gõ "%" hay "_" vẫn tìm đúng nghĩa đen.
            var pattern = "%" + filter.Keyword.Trim()
                .Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_") + "%";
            query = query.Where(r => EF.Functions.ILike(r.Title, pattern));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(r => r.UpdatedAt ?? r.CreatedAt).ThenBy(r => r.Id)
            .Include(r => r.Category)
            .Include(r => r.Images.Where(i => i.IsPrimary && !i.IsDeleted))
            .AsSplitQuery()
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        return (items, total);
    }

    public async Task<RecipeStatusCounts> CountByStatusAsync(
        string? authorId, CancellationToken cancellationToken = default)
    {
        var query = Set.IgnoreQueryFilters().AsNoTracking();
        if (authorId is not null) query = query.Where(r => r.AuthorId == authorId);

        var groups = await query
            .GroupBy(r => new { r.IsDeleted, r.Status })
            .Select(g => new { g.Key.IsDeleted, g.Key.Status, Count = g.Count() })
            .ToListAsync(cancellationToken);

        int Count(RecipeStatus status) => groups.Where(g => !g.IsDeleted && g.Status == status).Sum(g => g.Count);
        return new RecipeStatusCounts(Count(RecipeStatus.Draft), Count(RecipeStatus.Published),
            Count(RecipeStatus.Archived), groups.Where(g => g.IsDeleted).Sum(g => g.Count));
    }

    public Task<Recipe?> GetDeletedAsync(Guid id, CancellationToken cancellationToken = default)
        => Set.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == id && r.IsDeleted, cancellationToken);

    // Slug của bài đã xóa mềm vẫn chiếm chỗ trong index unique.
    public Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken = default)
        => Set.IgnoreQueryFilters().AnyAsync(r => r.Slug == slug, cancellationToken);

    private static IQueryable<Recipe> WithChildren(IQueryable<Recipe> query)
        => query
            .Include(r => r.Category)
            .Include(r => r.Ingredients)
            .Include(r => r.Steps)
            .Include(r => r.Images)
            .AsSplitQuery();

    private static IQueryable<Recipe> ApplyFilter(IQueryable<Recipe> query, RecipeFilter filter)
    {
        if (filter.CategoryId is { } categoryId) query = query.Where(r => r.CategoryId == categoryId);
        if (filter.Difficulty is { } difficulty) query = query.Where(r => r.Difficulty == difficulty);
        if (filter.MaxCookTime is { } maxCookTime) query = query.Where(r => r.CookTime <= maxCookTime);
        if (filter.MinServings is { } minServings) query = query.Where(r => r.Servings >= minServings);
        return query;
    }

    private static Task<List<Recipe>> PageAsync(
        IQueryable<Recipe> query, RecipeFilter filter, CancellationToken cancellationToken)
        => query.Include(r => r.Category)
            .Include(r => r.Images.Where(i => i.IsPrimary))
            .AsSplitQuery()
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);
}
