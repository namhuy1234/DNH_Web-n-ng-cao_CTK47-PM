namespace CulinaryBlog.Domain.Repositories;

/// <summary>Gom các repository dùng chung một DbContext, lưu tất cả trong một giao dịch.</summary>
public interface IUnitOfWork
{
    ICategoryRepository Categories { get; }
    IRecipeRepository Recipes { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>Chạy nhiều lần lưu trong cùng một giao dịch.</summary>
    Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken cancellationToken = default);
}
