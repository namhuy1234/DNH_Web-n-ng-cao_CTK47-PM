using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NpgsqlTypes;

namespace CulinaryBlog.Infrastructure.Persistence.Configurations;

public class RecipeConfiguration : IEntityTypeConfiguration<Recipe>
{
    public void Configure(EntityTypeBuilder<Recipe> builder)
    {
        builder.ToTable("Recipes", table =>
        {
            table.HasCheckConstraint("CK_Recipes_PrepTime", "\"PrepTime\" > 0");
            table.HasCheckConstraint("CK_Recipes_CookTime", "\"CookTime\" >= 0");
            table.HasCheckConstraint("CK_Recipes_Servings", "\"Servings\" > 0");
        });
        builder.ConfigureBase();

        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(220).IsRequired();
        builder.Property(x => x.Description).IsRequired();
        builder.Property(x => x.Instructions).IsRequired();
        builder.Property(x => x.Difficulty)
            .HasDefaultValue(RecipeDifficulty.Easy)
            .HasSentinel((RecipeDifficulty)0);
        builder.Property(x => x.Status).HasDefaultValue(RecipeStatus.Draft);
        builder.Property(x => x.AuthorId).HasMaxLength(450).IsRequired();

        // Cột tìm kiếm toàn văn: shadow property để Domain không phụ thuộc Npgsql.
        // Giá trị do trigger trong PostgreSQL cập nhật.
        builder.Property<NpgsqlTsVector>("SearchVector");

        builder.OwnsOne(x => x.Nutrition, nutrition =>
        {
            nutrition.Property(n => n.Calories).HasColumnName("Nutrition_Calories").HasPrecision(8, 2);
            nutrition.Property(n => n.Protein).HasColumnName("Nutrition_Protein").HasPrecision(8, 2);
            nutrition.Property(n => n.Carbohydrates).HasColumnName("Nutrition_Carbohydrates").HasPrecision(8, 2);
            nutrition.Property(n => n.Fat).HasColumnName("Nutrition_Fat").HasPrecision(8, 2);
            nutrition.Property(n => n.Fiber).HasColumnName("Nutrition_Fiber").HasPrecision(8, 2);
            nutrition.Property(n => n.Sodium).HasColumnName("Nutrition_Sodium").HasPrecision(8, 2);
        });

        builder.HasOne(x => x.Category)
            .WithMany(c => c.Recipes)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(x => x.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Steps).WithOne(s => s.Recipe)
            .HasForeignKey(s => s.RecipeId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.Ingredients).WithOne(i => i.Recipe)
            .HasForeignKey(i => i.RecipeId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.Images).WithOne(i => i.Recipe)
            .HasForeignKey(i => i.RecipeId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.Slug).IsUnique().HasDatabaseName("IDX_Recipe_Slug");
        builder.HasIndex(x => x.Difficulty).HasDatabaseName("IDX_Recipe_Difficulty");
        builder.HasIndex(x => x.Status).HasDatabaseName("IDX_Recipe_Status");
        builder.HasIndex(x => x.CategoryId).HasDatabaseName("IDX_Recipe_CategoryId");
        builder.HasIndex(x => x.AuthorId).HasDatabaseName("IDX_Recipe_AuthorId");
        builder.HasIndex(x => x.PublishedAt).HasDatabaseName("IDX_Recipe_PublishedAt");
        builder.HasIndex(x => x.IsDeleted).HasFilter("\"IsDeleted\" = false").HasDatabaseName("IDX_Recipe_IsDeleted");
        builder.HasIndex("SearchVector").HasMethod("GIN").HasDatabaseName("IDX_Recipe_Search");
    }
}
