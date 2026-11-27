using CulinaryBlog.Domain.Common;

namespace CulinaryBlog.Domain.Entities;

public class RecipeStep : BaseEntity
{
    private RecipeStep() { }

    internal RecipeStep(Guid recipeId, int stepNumber, string title, string description, int? timerMinutes, string? imageUrl)
    {
        RecipeId = recipeId;
        StepNumber = stepNumber;
        Title = title;
        Description = description;
        TimerMinutes = timerMinutes;
        ImageUrl = imageUrl;
    }

    public void Update(string title, string description, int? timerMinutes, string? imageUrl)
    {
        Title = title;
        Description = description;
        TimerMinutes = timerMinutes;
        ImageUrl = imageUrl;
    }

    internal void SetNumber(int number) => StepNumber = number;

    public Guid RecipeId { get; private set; }
    public Recipe Recipe { get; private set; } = null!;
    public int StepNumber { get; private set; }
    public string Title { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public int? TimerMinutes { get; private set; }
    public string? ImageUrl { get; private set; }
}
