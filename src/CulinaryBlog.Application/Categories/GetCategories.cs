using CulinaryBlog.Domain.Repositories;
using MediatR;

namespace CulinaryBlog.Application.Categories;

public record GetCategoriesQuery : IRequest<IReadOnlyList<CategoryDto>>;

public class GetCategoriesHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<GetCategoriesQuery, IReadOnlyList<CategoryDto>>
{
    public async Task<IReadOnlyList<CategoryDto>> Handle(GetCategoriesQuery request, CancellationToken cancellationToken)
    {
        var rows = await unitOfWork.Categories.GetAllWithRecipeCountAsync(cancellationToken);

        return rows.Select(x => new CategoryDto(
                x.Category.Id, x.Category.Name, x.Category.Slug,
                x.Category.Description, x.Category.ImageUrl, x.RecipeCount))
            .ToList();
    }
}
