using CulinaryBlog.Application.Common;
using CulinaryBlog.Application.Recipes;
using CulinaryBlog.Domain.Common;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Categories;

public record CategoryDetailDto(CategoryDto Category, PagedResult<RecipeSummaryDto> Recipes);

public record GetCategoryBySlugQuery(string Slug, int Page, int PageSize) : IRequest<CategoryDetailDto>;

public class GetCategoryBySlugValidator : AbstractValidator<GetCategoryBySlugQuery>
{
    public GetCategoryBySlugValidator()
    {
        RuleFor(x => x.Page).InclusiveBetween(1, 10_000).WithMessage("page phải từ 1 đến 10000.");
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50).WithMessage("pageSize phải từ 1 đến 50.");
    }
}

public class GetCategoryBySlugHandler(IUnitOfWork unitOfWork, RecipeSummaryMapper mapper, ICurrentUser currentUser)
    : IRequestHandler<GetCategoryBySlugQuery, CategoryDetailDto>
{
    public async Task<CategoryDetailDto> Handle(GetCategoryBySlugQuery request, CancellationToken cancellationToken)
    {
        var category = await unitOfWork.Categories.GetBySlugAsync(request.Slug, cancellationToken)
            ?? throw new NotFoundException(ErrorCodes.CategoryNotFound, "Không tìm thấy danh mục.");

        var filter = new RecipeFilter(request.Page, request.PageSize, category.Id, null, null, null,
            "-createdAt", currentUser.UserId, currentUser.IsAdmin);
        var (recipes, total) = await unitOfWork.Recipes.GetPageAsync(filter, cancellationToken);
        var count = (await unitOfWork.Categories.GetAllWithRecipeCountAsync(cancellationToken))
            .First(x => x.Category.Id == category.Id).RecipeCount;

        return new CategoryDetailDto(
            new CategoryDto(category.Id, category.Name, category.Slug, category.Description, category.ImageUrl, count),
            new PagedResult<RecipeSummaryDto>(
                await mapper.MapAsync(recipes, cancellationToken), total, request.Page, request.PageSize));
    }
}

public record UpdateCategoryCommand(Guid Id, string Name, string? Description, string? ImageUrl, int? OrderIndex)
    : IRequest<CategoryDto>;

public class UpdateCategoryValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryValidator()
    {
        RuleFor(x => (x.Name ?? string.Empty).Trim())
            .Cascade(CascadeMode.Stop)
            .Length(2, 50).WithMessage("Tên danh mục dài từ 2 đến 50 ký tự.")
            .Must(name => !name.Contains('<') && !name.Contains('>')).WithMessage("Tên danh mục không được chứa HTML.")
            .Must(name => SlugHelper.Generate(name).Length > 0).WithMessage("Tên danh mục phải có chữ hoặc số.")
            .OverridePropertyName(nameof(UpdateCategoryCommand.Name));
        RuleFor(x => x.Description).MaximumLength(2000).WithMessage("Mô tả tối đa 2000 ký tự.");
        RuleFor(x => x.ImageUrl).MaximumLength(500).WithMessage("imageUrl tối đa 500 ký tự.");
        RuleFor(x => x.OrderIndex).GreaterThanOrEqualTo(0).WithMessage("orderIndex không được âm.");
    }
}

public class UpdateCategoryHandler(IUnitOfWork unitOfWork) : IRequestHandler<UpdateCategoryCommand, CategoryDto>
{
    public async Task<CategoryDto> Handle(UpdateCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = await unitOfWork.Categories.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(ErrorCodes.CategoryNotFound, "Không tìm thấy danh mục.");

        var name = request.Name.Trim();
        if (await unitOfWork.Categories.NameExistsAsync(name, category.Id, cancellationToken))
            throw new ConflictException(ErrorCodes.CategoryNameExists, $"Danh mục '{name}' đã tồn tại.");

        category.Update(name, request.Description, request.ImageUrl, request.OrderIndex ?? category.OrderIndex);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var count = (await unitOfWork.Categories.GetAllWithRecipeCountAsync(cancellationToken))
            .First(x => x.Category.Id == category.Id).RecipeCount;
        return new CategoryDto(category.Id, category.Name, category.Slug, category.Description, category.ImageUrl, count);
    }
}

public record DeleteCategoryCommand(Guid Id) : IRequest;

public class DeleteCategoryHandler(IUnitOfWork unitOfWork) : IRequestHandler<DeleteCategoryCommand>
{
    public async Task Handle(DeleteCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = await unitOfWork.Categories.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(ErrorCodes.CategoryNotFound, "Không tìm thấy danh mục.");

        var count = await unitOfWork.Categories.CountRecipesAsync(category.Id, cancellationToken);
        if (count > 0)
            throw new ConflictException(ErrorCodes.CategoryDeleteHasRecipes, $"Danh mục còn chứa {count} công thức.");

        category.IsDeleted = true; // xóa mềm
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
