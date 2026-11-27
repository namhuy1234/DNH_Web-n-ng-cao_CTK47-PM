using CulinaryBlog.Domain.Enums;

namespace CulinaryBlog.Application.Recipes;

public record RecipeSummaryDto(
    Guid Id, string Title, string Slug, string Description,
    int PrepTime, int CookTime, int Servings, RecipeDifficulty Difficulty,
    string CategoryName, string AuthorName, DateTime CreatedAt);

public record IngredientDto(Guid Id, string Name, decimal? Quantity, string? Unit, string? Notes, int OrderIndex);

public record StepDto(Guid Id, int StepNumber, string Title, string Description, int? TimerMinutes);

public record NutritionDto(
    decimal? Calories, decimal? Protein, decimal? Carbohydrates, decimal? Fat, decimal? Fiber, decimal? Sodium);

public record RecipeDetailDto(
    Guid Id, string Title, string Slug, string Description, string Instructions,
    int PrepTime, int CookTime, int Servings, RecipeDifficulty Difficulty, DateTime? PublishedAt,
    string CategoryName, string CategorySlug, string AuthorName,
    NutritionDto? Nutrition, IReadOnlyList<IngredientDto> Ingredients, IReadOnlyList<StepDto> Steps);
