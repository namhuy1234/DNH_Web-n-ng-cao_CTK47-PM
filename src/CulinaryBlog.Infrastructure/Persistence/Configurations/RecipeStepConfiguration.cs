using CulinaryBlog.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CulinaryBlog.Infrastructure.Persistence.Configurations;

public class RecipeStepConfiguration : IEntityTypeConfiguration<RecipeStep>
{
    public void Configure(EntityTypeBuilder<RecipeStep> builder)
    {
        builder.ToTable("RecipeSteps", table =>
        {
            table.HasCheckConstraint("CK_RecipeSteps_StepNumber", "\"StepNumber\" > 0");
            table.HasCheckConstraint("CK_RecipeSteps_TimerMinutes", "\"TimerMinutes\" >= 0");
        });
        builder.ConfigureBase();

        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).IsRequired();
        builder.Property(x => x.ImageUrl).HasMaxLength(500);

        builder.HasIndex(x => new { x.RecipeId, x.StepNumber }).IsUnique().HasFilter("\"IsDeleted\" = false");
    }
}
