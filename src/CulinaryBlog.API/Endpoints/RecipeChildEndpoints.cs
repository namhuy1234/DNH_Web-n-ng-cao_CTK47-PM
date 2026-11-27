using CulinaryBlog.API.Services;
using CulinaryBlog.Application.Recipes;
using MediatR;

namespace CulinaryBlog.API.Endpoints;

public record UpdateImageRequest(string? AltText, bool? IsPrimary, int? OrderIndex);

public static class RecipeChildEndpoints
{
    public static void MapRecipeChildEndpoints(this IEndpointRouteBuilder app)
    {
        var recipe = app.MapGroup("/recipes/{id:guid}").RequireAuthorization(AuthSetup.AuthorPolicy);

        // ----- Nguyên liệu -----
        var ingredients = recipe.MapGroup("/ingredients").WithTags("Ingredients");
        ingredients.MapPost("/", async (Guid id, IngredientInput input, ISender sender, CancellationToken ct) =>
            Results.Json(await sender.Send(new AddIngredientCommand(id, input), ct), statusCode: 201));
        ingredients.MapPut("/{ingredientId:guid}", async (
            Guid id, Guid ingredientId, IngredientInput input, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new UpdateIngredientCommand(id, ingredientId, input), ct)));
        ingredients.MapDelete("/{ingredientId:guid}", async (
            Guid id, Guid ingredientId, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new DeleteIngredientCommand(id, ingredientId), ct);
            return Results.NoContent();
        });

        // ----- Bước làm -----
        var steps = recipe.MapGroup("/steps").WithTags("Steps");
        steps.MapPost("/", async (Guid id, StepInput input, ISender sender, CancellationToken ct) =>
            Results.Json(await sender.Send(new AddStepCommand(id, input), ct), statusCode: 201));
        steps.MapPut("/{stepId:guid}", async (
            Guid id, Guid stepId, StepInput input, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new UpdateStepCommand(id, stepId, input), ct)));
        steps.MapDelete("/{stepId:guid}", async (Guid id, Guid stepId, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new DeleteStepCommand(id, stepId), ct);
            return Results.NoContent();
        });

        // ----- Ảnh -----
        var images = recipe.MapGroup("/images").WithTags("Images");
        images.MapPost("/", async (
            Guid id, HttpRequest request, ISender sender, CancellationToken ct) =>
        {
            if (!request.HasFormContentType)
                throw new BadHttpRequestException("Cần gửi multipart/form-data.");

            var form = await request.ReadFormAsync(ct);
            var file = form.Files.GetFile("file") ?? throw new BadHttpRequestException("Thiếu trường file.");
            await using var content = file.OpenReadStream();

            var image = await sender.Send(new UploadImageCommand(
                id, content, file.Length, file.ContentType, form["altText"].FirstOrDefault(),
                bool.TryParse(form["isPrimary"], out var primary) && primary), ct);

            return Results.Json(image, statusCode: 201);
        })
        .RequireRateLimiting(RateLimitSetup.UploadPolicy)
        .Accepts<IFormFile>("multipart/form-data");
        images.MapPatch("/{imageId:guid}", async (
            Guid id, Guid imageId, UpdateImageRequest r, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(
                new UpdateImageCommand(id, imageId, r.AltText, r.IsPrimary, r.OrderIndex), ct)));
        images.MapDelete("/{imageId:guid}", async (Guid id, Guid imageId, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new DeleteImageCommand(id, imageId), ct);
            return Results.NoContent();
        });
    }
}
