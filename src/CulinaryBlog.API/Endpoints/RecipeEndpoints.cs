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
            RecipeDifficulty? difficulty = null, string sort = "-createdAt") =>
            Results.Ok(await sender.Send(new GetRecipesQuery(page, pageSize, categoryId, difficulty, sort), ct)));

        group.MapGet("/{slug}", async (string slug, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetRecipeBySlugQuery(slug), ct)));
    }
}
