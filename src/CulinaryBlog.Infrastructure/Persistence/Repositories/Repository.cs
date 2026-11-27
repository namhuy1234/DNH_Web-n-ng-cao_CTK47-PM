using CulinaryBlog.Domain.Common;
using CulinaryBlog.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace CulinaryBlog.Infrastructure.Persistence.Repositories;

public class Repository<T>(CulinaryBlogDbContext db) : IRepository<T> where T : BaseEntity
{
    protected CulinaryBlogDbContext Db { get; } = db;
    protected DbSet<T> Set => Db.Set<T>();

    public Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task AddAsync(T entity, CancellationToken cancellationToken = default)
        => await Set.AddAsync(entity, cancellationToken);

    public void Remove(T entity) => Set.Remove(entity);
}
