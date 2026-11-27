using CulinaryBlog.Domain.Common;

namespace CulinaryBlog.Domain.Entities;

public class RecipeImage : BaseEntity
{
    private RecipeImage() { }

    internal RecipeImage(Guid recipeId, string originalUrl, string? altText, bool isPrimary, int orderIndex)
    {
        RecipeId = recipeId;
        OriginalUrl = originalUrl;
        AltText = altText;
        IsPrimary = isPrimary;
        OrderIndex = orderIndex;
    }

    public Guid RecipeId { get; private set; }
    public Recipe Recipe { get; private set; } = null!;
    public string OriginalUrl { get; private set; } = null!;
    public string? MediumUrl { get; private set; }
    public string? ThumbnailUrl { get; private set; }
    public string? AltText { get; private set; }
    public bool IsPrimary { get; private set; }
    public int OrderIndex { get; private set; }
}
