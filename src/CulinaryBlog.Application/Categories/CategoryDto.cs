namespace CulinaryBlog.Application.Categories;

public record CategoryDto(Guid Id, string Name, string Slug, string? Description, string? ImageUrl, int RecipeCount);
