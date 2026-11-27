using CulinaryBlog.API.Services;
using CulinaryBlog.Application.Recipes;
using CulinaryBlog.Domain.Enums;
using MediatR;

namespace CulinaryBlog.API.Endpoints;

public record UpdateRecipeRequest(
    string Title, string Description, Guid CategoryId, int PrepTime, int CookTime, int Servings,
    RecipeDifficulty Difficulty, string? Instructions, NutritionInput? Nutrition, string? RowVersion);

public static class RecipeEndpoints
{
    public static void MapRecipeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/recipes").WithTags("Recipes");

        group.MapGet("/", async (
            ISender sender, CancellationToken ct,
            int page = 1, int pageSize = 12, Guid? categoryId = null, string? difficulty = null,
            int? maxCookTime = null, int? minServings = null, string sort = "-createdAt") =>
            Results.Ok(await sender.Send(new GetRecipesQuery(
                page, pageSize, categoryId, ParseDifficulty(difficulty), maxCookTime, minServings, sort), ct)));

        group.MapGet("/search", async (
            ISender sender, CancellationToken ct,
            string? q = null, int page = 1, int pageSize = 10, Guid? categoryId = null, string? difficulty = null) =>
            Results.Ok(await sender.Send(
                new SearchRecipesQuery(q, page, pageSize, categoryId, ParseDifficulty(difficulty)), ct)));

        group.MapGet("/{slug}", async (string slug, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetRecipeBySlugQuery(slug), ct)));

        // Các thao tác ghi: phải đăng nhập; quyền sở hữu được kiểm tra ở tầng Application.
        var write = group.MapGroup("").RequireAuthorization(AuthSetup.AuthorPolicy);

        write.MapPost("/", async (CreateRecipeCommand command, ISender sender, CancellationToken ct) =>
        {
            var recipe = await sender.Send(command, ct);
            return Results.Created($"/api/v1/recipes/{recipe.Slug}", recipe);
        });

        write.MapPut("/{id:guid}", async (
            Guid id, UpdateRecipeRequest r, HttpRequest http, ISender sender, CancellationToken ct) =>
        {
            var ifMatch = http.Headers.IfMatch.ToString().Trim('"');
            return Results.Ok(await sender.Send(new UpdateRecipeCommand(
                id, r.Title, r.Description, r.CategoryId, r.PrepTime, r.CookTime, r.Servings, r.Difficulty,
                r.Instructions, r.Nutrition, ifMatch.Length > 0 ? ifMatch : r.RowVersion), ct));
        });

        write.MapDelete("/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new DeleteRecipeCommand(id), ct);
            return Results.NoContent();
        });

        foreach (var (path, action) in new[]
                 {
                     ("publish", RecipeAction.Publish), ("unpublish", RecipeAction.Unpublish),
                     ("archive", RecipeAction.Archive)
                 })
        {
            write.MapPatch($"/{{id:guid}}/{path}", async (Guid id, ISender sender, CancellationToken ct) =>
                Results.Ok(await sender.Send(new ChangeRecipeStatusCommand(id, action), ct)));
        }
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
