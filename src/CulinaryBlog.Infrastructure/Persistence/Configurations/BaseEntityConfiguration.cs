using CulinaryBlog.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CulinaryBlog.Infrastructure.Persistence.Configurations;

internal static class BaseEntityConfiguration
{
    public static void ConfigureBase<T>(this EntityTypeBuilder<T> builder) where T : BaseEntity
    {
        builder.HasKey(x => x.Id);
        // Id được tạo trong code, DEFAULT chỉ dùng khi thêm dữ liệu trực tiếp bằng SQL.
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()").ValueGeneratedNever();
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Property(x => x.RowVersion).IsRequired().IsConcurrencyToken();
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
