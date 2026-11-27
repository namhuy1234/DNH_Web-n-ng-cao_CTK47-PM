using CulinaryBlog.Domain.Common;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Exceptions;

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
        int prepTime, int cookTime, int servings, RecipeDifficulty difficulty, string? slug = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(authorId);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(prepTime);
        ArgumentOutOfRangeException.ThrowIfNegative(cookTime);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(servings);

        return new Recipe
        {
            Title = title.Trim(),
            Slug = slug ?? SlugHelper.Generate(title),
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

    public void Update(
        string title, string description, string instructions, Guid categoryId,
        int prepTime, int cookTime, int servings, RecipeDifficulty difficulty)
    {
        Title = title.Trim();
        Description = description;
        Instructions = instructions;
        CategoryId = categoryId;
        PrepTime = prepTime;
        CookTime = cookTime;
        Servings = servings;
        Difficulty = difficulty;
        Touch();
    }

    /// <summary>Đánh dấu aggregate đã đổi để RowVersion được cấp lại, kể cả khi chỉ sửa thành phần con.</summary>
    public void Touch() => UpdatedAt = DateTime.UtcNow;

    // ----- Nguyên liệu -----
    public RecipeIngredient AddIngredient(
        string name, decimal? quantity, string? unit, string? notes = null, int? orderIndex = null)
    {
        var order = orderIndex ?? (_ingredients.Count == 0 ? 1 : _ingredients.Max(i => i.OrderIndex) + 1);
        var ingredient = new RecipeIngredient(Id, name, quantity, unit, notes, order);
        _ingredients.Add(ingredient);
        return ingredient;
    }

    public RecipeIngredient GetIngredient(Guid id)
        => _ingredients.FirstOrDefault(i => i.Id == id)
           ?? throw new NotFoundException(ErrorCodes.IngredientNotFound, "Không tìm thấy nguyên liệu.");

    public void RemoveIngredient(RecipeIngredient ingredient)
    {
        if (Status == RecipeStatus.Published && _ingredients.Count == 1)
            throw new BusinessRuleException(ErrorCodes.RecipePublishIncomplete,
                "Công thức đã công khai phải còn ít nhất 1 nguyên liệu.");

        _ingredients.Remove(ingredient);
    }

    // ----- Bước làm -----
    public RecipeStep AddStep(string title, string description, int? timerMinutes = null, string? imageUrl = null)
    {
        // Lấy số lớn nhất + 1 để không trùng số thứ tự sau khi đã xóa bước.
        var number = _steps.Count == 0 ? 1 : _steps.Max(s => s.StepNumber) + 1;
        var step = new RecipeStep(Id, number, title, description, timerMinutes, imageUrl);
        _steps.Add(step);
        return step;
    }

    public RecipeStep GetStep(Guid id)
        => _steps.FirstOrDefault(s => s.Id == id)
           ?? throw new NotFoundException(ErrorCodes.StepNotFound, "Không tìm thấy bước thực hiện.");

    public void RemoveStep(RecipeStep step)
    {
        if (Status == RecipeStatus.Published && _steps.Count == 1)
            throw new BusinessRuleException(ErrorCodes.RecipePublishIncomplete, "Công thức đã công khai phải còn ít nhất 1 bước.");

        _steps.Remove(step);
        Renumber(_steps.OrderBy(s => s.StepNumber).ToList());
    }

    /// <summary>Thứ tự các bước sau khi chuyển một bước đến vị trí mới.</summary>
    public IReadOnlyList<RecipeStep> OrderWithStepMovedTo(RecipeStep step, int position)
    {
        var ordered = _steps.Where(s => s != step).OrderBy(s => s.StepNumber).ToList();
        ordered.Insert(Math.Clamp(position, 1, ordered.Count + 1) - 1, step);
        return ordered;
    }

    public static void Renumber(IReadOnlyList<RecipeStep> ordered, int offset = 0)
    {
        for (var i = 0; i < ordered.Count; i++)
            ordered[i].SetNumber(offset + i + 1);
    }

    // ----- Ảnh -----
    public RecipeImage AddImage(string originalUrl, string? altText = null)
    {
        var order = _images.Count == 0 ? 0 : _images.Max(i => i.OrderIndex) + 1;
        var image = new RecipeImage(Id, originalUrl, altText, !_images.Any(i => i.IsPrimary), order);
        _images.Add(image);
        return image;
    }

    public RecipeImage GetImage(Guid id)
        => _images.FirstOrDefault(i => i.Id == id)
           ?? throw new NotFoundException(ErrorCodes.ImageNotFound, "Không tìm thấy ảnh.");

    public void RemoveImage(RecipeImage image) => _images.Remove(image);

    public void SetNutrition(RecipeNutrition? nutrition) => Nutrition = nutrition;

    // ----- Trạng thái -----
    public void Publish(DateTime publishedAt)
    {
        if (Status == RecipeStatus.Published) return; // gọi lại không đổi ngày xuất bản

        if (_steps.Count == 0 || _ingredients.Count == 0)
            throw new BusinessRuleException(ErrorCodes.RecipePublishIncomplete,
                "Công thức phải có ít nhất 1 nguyên liệu và 1 bước thực hiện.");

        Status = RecipeStatus.Published;
        PublishedAt = publishedAt;
        Touch();
    }

    public void Unpublish()
    {
        if (Status == RecipeStatus.Draft) return;

        Status = RecipeStatus.Draft;
        PublishedAt = null;
        Touch();
    }

    public void Archive()
    {
        if (Status == RecipeStatus.Archived) return;

        Status = RecipeStatus.Archived;
        Touch();
    }
}
