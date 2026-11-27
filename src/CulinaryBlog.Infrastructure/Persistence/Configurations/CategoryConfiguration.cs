using CulinaryBlog.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CulinaryBlog.Infrastructure.Persistence.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories");
        builder.ConfigureBase();

        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        builder.Property(x => x.ImageUrl).HasMaxLength(500);
        builder.Property(x => x.OrderIndex).HasDefaultValue(0);

        // Chỉ bắt trùng giữa các danh mục chưa xóa, để tên đã xóa mềm dùng lại được.
        builder.HasIndex(x => x.Name).IsUnique().HasFilter("\"IsDeleted\" = false");
        builder.HasIndex(x => x.Slug).IsUnique().HasFilter("\"IsDeleted\" = false")
            .HasDatabaseName("IDX_Category_Slug");
    }
}
