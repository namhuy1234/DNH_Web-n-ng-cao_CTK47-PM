using CulinaryBlog.Application.Common;
using CulinaryBlog.Domain.Common;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Recipes;

// ----- Danh sách (FR-RCP-001) -----
public record GetRecipesQuery(
    int Page, int PageSize, Guid? CategoryId, RecipeDifficulty? Difficulty,
    int? MaxCookTime, int? MinServings, string Sort) : IRequest<PagedResult<RecipeSummaryDto>>;

public class GetRecipesValidator : AbstractValidator<GetRecipesQuery>
{
    private static readonly string[] Sorts = ["-createdAt", "createdAt", "title", "-title", "cookTime", "-cookTime"];

    public GetRecipesValidator()
    {
        RuleFor(x => x.Page).InclusiveBetween(1, 10_000).WithMessage("page phải từ 1 đến 10000.");
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50).WithMessage("pageSize phải từ 1 đến 50.");
        RuleFor(x => x.Difficulty).IsInEnum().WithMessage("difficulty không hợp lệ.");
        RuleFor(x => x.MaxCookTime).GreaterThanOrEqualTo(0).WithMessage("maxCookTime không được âm.");
        RuleFor(x => x.MinServings).GreaterThanOrEqualTo(1).WithMessage("minServings phải từ 1.");
        RuleFor(x => x.Sort).Must(Sorts.Contains).WithMessage($"sort chỉ nhận: {string.Join(", ", Sorts)}.");
    }
}

public class GetRecipesHandler(IUnitOfWork unitOfWork, RecipeSummaryMapper mapper, ICurrentUser currentUser)
    : IRequestHandler<GetRecipesQuery, PagedResult<RecipeSummaryDto>>
{
    public async Task<PagedResult<RecipeSummaryDto>> Handle(GetRecipesQuery request, CancellationToken cancellationToken)
    {
        var filter = new RecipeFilter(request.Page, request.PageSize, request.CategoryId, request.Difficulty,
            request.MaxCookTime, request.MinServings, request.Sort, currentUser.UserId, currentUser.IsAdmin);
        var (recipes, total) = await unitOfWork.Recipes.GetPageAsync(filter, cancellationToken);

        return new PagedResult<RecipeSummaryDto>(
            await mapper.MapAsync(recipes, cancellationToken), total, request.Page, request.PageSize);
    }
}

// ----- Tìm kiếm toàn văn (FR-SRCH-001) -----
public record SearchRecipesQuery(string? Q, int Page, int PageSize, Guid? CategoryId, RecipeDifficulty? Difficulty)
    : IRequest<PagedResult<RecipeSummaryDto>>;

public class SearchRecipesValidator : AbstractValidator<SearchRecipesQuery>
{
    public SearchRecipesValidator()
    {
        RuleFor(x => x.Q)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Thiếu từ khóa q.")
            .Must(q => q!.Length <= 100 && SlugHelper.Generate(q).Replace("-", "").Length >= 2)
            .WithMessage("Từ khóa cần từ 2 chữ hoặc số, tối đa 100 ký tự.");
        RuleFor(x => x.Page).InclusiveBetween(1, 10_000).WithMessage("page phải từ 1 đến 10000.");
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50).WithMessage("pageSize phải từ 1 đến 50.");
        RuleFor(x => x.Difficulty).IsInEnum().WithMessage("difficulty không hợp lệ.");
    }
}

public class SearchRecipesHandler(IUnitOfWork unitOfWork, RecipeSummaryMapper mapper)
    : IRequestHandler<SearchRecipesQuery, PagedResult<RecipeSummaryDto>>
{
    public async Task<PagedResult<RecipeSummaryDto>> Handle(SearchRecipesQuery request, CancellationToken cancellationToken)
    {
        // SlugHelper bỏ dấu và loại mọi ký tự đặc biệt nên chuỗi tsquery luôn an toàn.
        var tsQuery = string.Join(" & ", SlugHelper.Generate(request.Q!)
            .Split('-', StringSplitOptions.RemoveEmptyEntries)
            .Select(term => term + ":*"));

        var filter = new RecipeFilter(request.Page, request.PageSize, request.CategoryId, request.Difficulty,
            null, null, "relevance");
        var (recipes, total) = await unitOfWork.Recipes.SearchAsync(tsQuery, filter, cancellationToken);

        return new PagedResult<RecipeSummaryDto>(
            await mapper.MapAsync(recipes, cancellationToken), total, request.Page, request.PageSize);
    }
}

// ----- Chi tiết (FR-RCP-002) -----
public record GetRecipeBySlugQuery(string Slug) : IRequest<RecipeDetailDto>;

public class GetRecipeBySlugHandler(RecipeDetailReader reader, RecipeAccess access)
    : IRequestHandler<GetRecipeBySlugQuery, RecipeDetailDto>
{
    public async Task<RecipeDetailDto> Handle(GetRecipeBySlugQuery request, CancellationToken cancellationToken)
    {
        var (recipe, dto) = await reader.ReadAsync(request.Slug, cancellationToken);

        if (recipe.Status != RecipeStatus.Published && !access.CanManage(recipe))
            throw new ForbiddenException(ErrorCodes.RecipeForbidden, "Công thức chưa được công khai.");

        return dto;
    }
}
