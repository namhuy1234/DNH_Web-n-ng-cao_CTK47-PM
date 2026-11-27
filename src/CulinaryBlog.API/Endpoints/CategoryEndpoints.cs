using CulinaryBlog.API.Services;
using CulinaryBlog.Application.Categories;
using MediatR;

namespace CulinaryBlog.API.Endpoints;

public record UpdateCategoryRequest(string Name, string? Description, string? ImageUrl, int? OrderIndex);

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/categories").WithTags("Categories");

        group.MapGet("/", async (ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetCategoriesQuery(), ct)));

        group.MapGet("/{slug}", async (string slug, ISender sender, CancellationToken ct, int page = 1, int pageSize = 12) =>
            Results.Ok(await sender.Send(new GetCategoryBySlugQuery(slug, page, pageSize), ct)));

        group.MapPost("/", async (CreateCategoryCommand command, ISender sender, CancellationToken ct) =>
        {
            var category = await sender.Send(command, ct);
            return Results.Created($"/api/v1/categories/{category.Slug}", category);
        }).RequireAuthorization(AuthSetup.AdminPolicy);

        group.MapPut("/{id:guid}", async (Guid id, UpdateCategoryRequest r, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(
                new UpdateCategoryCommand(id, r.Name, r.Description, r.ImageUrl, r.OrderIndex), ct)))
            .RequireAuthorization(AuthSetup.AdminPolicy);

        group.MapDelete("/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new DeleteCategoryCommand(id), ct);
            return Results.NoContent();
        }).RequireAuthorization(AuthSetup.AdminPolicy);
    }
}
