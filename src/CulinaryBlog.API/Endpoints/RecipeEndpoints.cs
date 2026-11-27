using CulinaryBlog.Application.Recipes;
using CulinaryBlog.Domain.Enums;
using MediatR;

namespace CulinaryBlog.API.Endpoints;

public static class RecipeEndpoints
{
    public static void MapRecipeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/recipes").WithTags("Recipes");

        group.MapGet("/", async (
            ISender sender, CancellationToken ct,
            int page = 1, int pageSize = 12, Guid? categoryId = null,
            string? difficulty = null, string sort = "-createdAt") =>
            Results.Ok(await sender.Send(new GetRecipesQuery(page, pageSize, categoryId, ParseDifficulty(difficulty), sort), ct)));

        group.MapGet("/{slug}", async (string slug, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetRecipeBySlugQuery(slug), ct)));
    }

    // Binding enum mặc định phân biệt hoa thường nên tự đọc; giá trị ngoài enum do validator chặn.
    private static RecipeDifficulty? ParseDifficulty(string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;

        return Enum.TryParse<RecipeDifficulty>(value, ignoreCase: true, out var difficulty)
            ? difficulty
            : throw new BadHttpRequestException("difficulty không hợp lệ.");
    }
}
