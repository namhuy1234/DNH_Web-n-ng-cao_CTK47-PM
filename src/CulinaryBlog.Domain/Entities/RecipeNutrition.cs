namespace CulinaryBlog.Domain.Entities;

/// <summary>Owned entity: lưu thành các cột Nutrition_* trong bảng Recipes (SRS 7.2.1).</summary>
public class RecipeNutrition
{
    public decimal? Calories { get; set; }
    public decimal? Protein { get; set; }
    public decimal? Carbohydrates { get; set; }
    public decimal? Fat { get; set; }
    public decimal? Fiber { get; set; }
    public decimal? Sodium { get; set; }
}
