using CulinaryBlog.Application.Common;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Recipes;

public record GetRecipesQuery(int Page, int PageSize, Guid? CategoryId, RecipeDifficulty? Difficulty, string Sort)
    : IRequest<PagedResult<RecipeSummaryDto>>;

public class GetRecipesValidator : AbstractValidator<GetRecipesQuery>
{
    private static readonly string[] Sorts = ["-createdAt", "createdAt", "title", "-title", "cookTime", "-cookTime"];

    public GetRecipesValidator()
    {
        RuleFor(x => x.Page).InclusiveBetween(1, 10_000).WithMessage("page phải từ 1 đến 10000.");
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50).WithMessage("pageSize phải từ 1 đến 50.");
        RuleFor(x => x.Difficulty).IsInEnum().WithMessage("difficulty không hợp lệ.");
        RuleFor(x => x.Sort).Must(Sorts.Contains).WithMessage($"sort chỉ nhận: {string.Join(", ", Sorts)}.");
    }
}

public class GetRecipesHandler(IUnitOfWork unitOfWork, IUserReader users)
    : IRequestHandler<GetRecipesQuery, PagedResult<RecipeSummaryDto>>
{
    public async Task<PagedResult<RecipeSummaryDto>> Handle(GetRecipesQuery request, CancellationToken cancellationToken)
    {
        var filter = new RecipeFilter(request.Page, request.PageSize, request.CategoryId, request.Difficulty, request.Sort);
        var (recipes, total) = await unitOfWork.Recipes.GetPublishedPageAsync(filter, cancellationToken);
        var authors = await users.GetDisplayNamesAsync(recipes.Select(r => r.AuthorId), cancellationToken);

        var items = recipes.Select(r => new RecipeSummaryDto(
                r.Id, r.Title, r.Slug, r.Description, r.PrepTime, r.CookTime, r.Servings, r.Difficulty,
                r.Category.Name, authors.GetValueOrDefault(r.AuthorId, ""), r.CreatedAt))
            .ToList();

        return new PagedResult<RecipeSummaryDto>(items, total, request.Page, request.PageSize);
    }
}
