using CulinaryBlog.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CulinaryBlog.Infrastructure.Persistence.Configurations;

public class RecipeImageConfiguration : IEntityTypeConfiguration<RecipeImage>
{
    public void Configure(EntityTypeBuilder<RecipeImage> builder)
    {
        builder.ToTable("RecipeImages");
        builder.ConfigureBase();

        builder.Property(x => x.OriginalUrl).HasMaxLength(500).IsRequired();
        builder.Property(x => x.MediumUrl).HasMaxLength(500);
        builder.Property(x => x.ThumbnailUrl).HasMaxLength(500);
        builder.Property(x => x.AltText).HasMaxLength(200);
        builder.Property(x => x.IsPrimary).HasDefaultValue(false);
        builder.Property(x => x.OrderIndex).HasDefaultValue(0);

        // Mỗi công thức chỉ có 1 ảnh chính.
        builder.HasIndex(x => x.RecipeId)
            .IsUnique()
            .HasFilter("\"IsPrimary\" = true AND \"IsDeleted\" = false")
            .HasDatabaseName("IDX_RecipeImage_Primary");
    }
}
