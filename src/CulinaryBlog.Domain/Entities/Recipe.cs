using CulinaryBlog.Domain.Common;
using CulinaryBlog.Domain.Enums;

namespace CulinaryBlog.Domain.Entities;

/// <summary>Aggregate root: nguyên liệu, bước làm và ảnh được thêm thông qua Recipe.</summary>
public class Recipe : BaseEntity
{
    private readonly List<RecipeStep> _steps = [];
    private readonly List<RecipeIngredient> _ingredients = [];
    private readonly List<RecipeImage> _images = [];

    private Recipe() { }

    public string Title { get; private set; } = null!;
    public string Slug { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public string Instructions { get; private set; } = null!;
    public int PrepTime { get; private set; }
    public int CookTime { get; private set; }
    public int Servings { get; private set; }
    public RecipeDifficulty Difficulty { get; private set; } = RecipeDifficulty.Easy;
    public RecipeStatus Status { get; private set; } = RecipeStatus.Draft;
    public DateTime? PublishedAt { get; private set; }
    public RecipeNutrition? Nutrition { get; private set; }

    public Guid CategoryId { get; private set; }
    public Category Category { get; private set; } = null!;

    // Domain không phụ thuộc ASP.NET Identity nên chỉ giữ khóa ngoại của tác giả.
    public string AuthorId { get; private set; } = null!;

    public IReadOnlyCollection<RecipeStep> Steps => _steps;
    public IReadOnlyCollection<RecipeIngredient> Ingredients => _ingredients;
    public IReadOnlyCollection<RecipeImage> Images => _images;

    public static Recipe Create(
        string title, string description, string instructions, Guid categoryId, string authorId,
        int prepTime, int cookTime, int servings, RecipeDifficulty difficulty)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(authorId);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(prepTime);
        ArgumentOutOfRangeException.ThrowIfNegative(cookTime);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(servings);

        return new Recipe
        {
            Title = title.Trim(),
            Slug = SlugHelper.Generate(title),
            Description = description,
            Instructions = instructions,
            CategoryId = categoryId,
            AuthorId = authorId,
            PrepTime = prepTime,
            CookTime = cookTime,
            Servings = servings,
            Difficulty = difficulty
        };
    }

    public void AddIngredient(string name, decimal? quantity, string? unit, string? notes = null)
        => _ingredients.Add(new RecipeIngredient(Id, name, quantity, unit, notes, _ingredients.Count + 1));

    public void AddStep(string title, string description, int? timerMinutes = null, string? imageUrl = null)
        => _steps.Add(new RecipeStep(Id, _steps.Count + 1, title, description, timerMinutes, imageUrl));

    public void AddImage(string originalUrl, string? altText = null)
        => _images.Add(new RecipeImage(Id, originalUrl, altText, _images.Count == 0, _images.Count));

    public void SetNutrition(RecipeNutrition nutrition) => Nutrition = nutrition;

    public void Publish(DateTime publishedAt)
    {
        if (_steps.Count == 0)
            throw new InvalidOperationException("Công thức phải có ít nhất 1 bước thực hiện.");

        Status = RecipeStatus.Published;
        PublishedAt = publishedAt;
    }

    public void Archive() => Status = RecipeStatus.Archived;
}
