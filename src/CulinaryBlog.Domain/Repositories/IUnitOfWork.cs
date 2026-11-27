namespace CulinaryBlog.Domain.Repositories;

/// <summary>Gom các repository dùng chung một DbContext, lưu tất cả trong một giao dịch.</summary>
public interface IUnitOfWork
{
    ICategoryRepository Categories { get; }
    IRecipeRepository Recipes { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
