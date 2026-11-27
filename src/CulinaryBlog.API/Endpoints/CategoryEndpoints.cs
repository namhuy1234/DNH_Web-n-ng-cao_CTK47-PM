using CulinaryBlog.Application.Categories;
using MediatR;

namespace CulinaryBlog.API.Endpoints;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/categories").WithTags("Categories");

        group.MapGet("/", async (ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetCategoriesQuery(), ct)));

        // SRS yêu cầu quyền Admin; sẽ thêm khi làm xác thực (Lab 5).
        group.MapPost("/", async (CreateCategoryCommand command, ISender sender, CancellationToken ct) =>
        {
            var category = await sender.Send(command, ct);
            return Results.Created($"/api/v1/categories/{category.Slug}", category);
        });
    }
}
