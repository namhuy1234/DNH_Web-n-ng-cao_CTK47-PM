using CulinaryBlog.Application.Common;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;
using MediatR;

namespace CulinaryBlog.Application.Recipes;

public record GetRecipeBySlugQuery(string Slug) : IRequest<RecipeDetailDto>;

public class GetRecipeBySlugHandler(IUnitOfWork unitOfWork, IUserReader users)
    : IRequestHandler<GetRecipeBySlugQuery, RecipeDetailDto>
{
    public async Task<RecipeDetailDto> Handle(GetRecipeBySlugQuery request, CancellationToken cancellationToken)
    {
        var recipe = await unitOfWork.Recipes.GetDetailBySlugAsync(request.Slug, cancellationToken)
            ?? throw new NotFoundException(ErrorCodes.RecipeNotFound, $"Không tìm thấy công thức '{request.Slug}'.");

        // Chưa có đăng nhập: bản nháp và bản lưu trữ bị chặn với mọi người.
        if (recipe.Status != RecipeStatus.Published)
            throw new ForbiddenException(ErrorCodes.RecipeForbidden, "Công thức chưa được công khai.");

        var authors = await users.GetDisplayNamesAsync([recipe.AuthorId], cancellationToken);
        var n = recipe.Nutrition;

        return new RecipeDetailDto(
            recipe.Id, recipe.Title, recipe.Slug, recipe.Description, recipe.Instructions,
            recipe.PrepTime, recipe.CookTime, recipe.Servings, recipe.Difficulty, recipe.PublishedAt,
            recipe.Category.Name, recipe.Category.Slug, authors.GetValueOrDefault(recipe.AuthorId, ""),
            n is null ? null : new NutritionDto(n.Calories, n.Protein, n.Carbohydrates, n.Fat, n.Fiber, n.Sodium),
            recipe.Ingredients.OrderBy(i => i.OrderIndex)
                .Select(i => new IngredientDto(i.Id, i.Name, i.Quantity, i.Unit, i.Notes, i.OrderIndex)).ToList(),
            recipe.Steps.OrderBy(s => s.StepNumber)
                .Select(s => new StepDto(s.Id, s.StepNumber, s.Title, s.Description, s.TimerMinutes)).ToList());
    }
}
