using CulinaryBlog.Domain.Common;

namespace CulinaryBlog.Domain.Entities;

public class RecipeIngredient : BaseEntity
{
    private RecipeIngredient() { }

    internal RecipeIngredient(Guid recipeId, string name, decimal? quantity, string? unit, string? notes, int orderIndex)
    {
        RecipeId = recipeId;
        Name = name;
        Quantity = quantity;
        Unit = unit;
        Notes = notes;
        OrderIndex = orderIndex;
    }

    public Guid RecipeId { get; private set; }
    public Recipe Recipe { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public decimal? Quantity { get; private set; }
    public string? Unit { get; private set; }
    public string? Notes { get; private set; }
    public int OrderIndex { get; private set; }
}
