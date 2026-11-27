using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace CulinaryBlog.Infrastructure.Persistence;

public class UnitOfWork(CulinaryBlogDbContext db, ICategoryRepository categories, IRecipeRepository recipes)
    : IUnitOfWork
{
    public ICategoryRepository Categories { get; } = categories;
    public IRecipeRepository Recipes { get; } = recipes;

    public async Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken cancellationToken = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await action();
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException(ErrorCodes.ConcurrencyConflict, "Dữ liệu đã bị người khác thay đổi.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Hai request tạo trùng cùng lúc: kiểm tra trước đã qua nhưng index unique chặn lại.
            throw new ConflictException(ErrorCodes.DuplicateValue, "Giá trị đã tồn tại.");
        }
    }
}
