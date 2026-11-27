using CulinaryBlog.Domain.Enums;

namespace CulinaryBlog.Application.Recipes;

public record RecipeSummaryDto(
    Guid Id, string Title, string Slug, string Description,
    int PrepTime, int CookTime, int Servings, RecipeDifficulty Difficulty, RecipeStatus Status,
    string CategoryName, string AuthorName, string? PrimaryImageUrl, DateTime CreatedAt);

public record IngredientDto(Guid Id, string Name, decimal? Quantity, string? Unit, string? Notes, int OrderIndex);

public record StepDto(Guid Id, int StepNumber, string Title, string Description, int? TimerMinutes, string? ImageUrl);

public record ImageDto(Guid Id, string OriginalUrl, string? AltText, bool IsPrimary, int OrderIndex);

public record NutritionDto(
    decimal? Calories, decimal? Protein, decimal? Carbohydrates, decimal? Fat, decimal? Fiber, decimal? Sodium);

public record RecipeDetailDto(
    Guid Id, string Title, string Slug, string Description, string Instructions,
    int PrepTime, int CookTime, int Servings, RecipeDifficulty Difficulty, RecipeStatus Status, DateTime? PublishedAt,
    Guid CategoryId, string CategoryName, string CategorySlug, string AuthorId, string AuthorName, string RowVersion,
    NutritionDto? Nutrition, IReadOnlyList<IngredientDto> Ingredients, IReadOnlyList<StepDto> Steps,
    IReadOnlyList<ImageDto> Images);
