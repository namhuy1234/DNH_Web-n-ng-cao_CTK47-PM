using CulinaryBlog.Application.Common;
using CulinaryBlog.Domain.Common;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Recipes;

public record NutritionInput(
    decimal? Calories, decimal? Protein, decimal? Carbohydrates, decimal? Fat, decimal? Fiber, decimal? Sodium)
{
    public RecipeNutrition ToEntity() => new()
    {
        Calories = Calories, Protein = Protein, Carbohydrates = Carbohydrates, Fat = Fat, Fiber = Fiber, Sodium = Sodium
    };
}

public class NutritionValidator : AbstractValidator<NutritionInput>
{
    public NutritionValidator()
    {
        RuleFor(x => x.Calories).InclusiveBetween(0, 999999);
        RuleFor(x => x.Protein).InclusiveBetween(0, 999999);
        RuleFor(x => x.Carbohydrates).InclusiveBetween(0, 999999);
        RuleFor(x => x.Fat).InclusiveBetween(0, 999999);
        RuleFor(x => x.Fiber).InclusiveBetween(0, 999999);
        RuleFor(x => x.Sodium).InclusiveBetween(0, 999999);
    }
}

/// <summary>Các trường chung của tạo mới và cập nhật.</summary>
public interface IRecipeFields
{
    string Title { get; }
    string Description { get; }
    Guid CategoryId { get; }
    int PrepTime { get; }
    int CookTime { get; }
    int Servings { get; }
    RecipeDifficulty Difficulty { get; }
    string? Instructions { get; }
    NutritionInput? Nutrition { get; }
}

public class RecipeFieldsValidator : AbstractValidator<IRecipeFields>
{
    public RecipeFieldsValidator()
    {
        RuleFor(x => (x.Title ?? string.Empty).Trim())
            .Cascade(CascadeMode.Stop)
            .Length(5, 200).WithMessage("Tiêu đề dài từ 5 đến 200 ký tự.")
            .Must(title => SlugHelper.Generate(title).Length > 0).WithMessage("Tiêu đề phải có chữ hoặc số.")
            .OverridePropertyName("Title");
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000).WithMessage("Mô tả bắt buộc, tối đa 2000 ký tự.");
        RuleFor(x => x.Instructions).MaximumLength(10000);
        RuleFor(x => x.CategoryId).NotEmpty().WithMessage("Thiếu categoryId.");
        RuleFor(x => x.PrepTime).InclusiveBetween(1, 10_000).WithMessage("prepTime phải lớn hơn 0.");
        RuleFor(x => x.CookTime).InclusiveBetween(0, 10_000).WithMessage("cookTime không được âm.");
        RuleFor(x => x.Servings).InclusiveBetween(1, 1000).WithMessage("servings phải lớn hơn 0.");
        RuleFor(x => x.Difficulty).IsInEnum().WithMessage("difficulty không hợp lệ.");
        RuleFor(x => x.Nutrition!).SetValidator(new NutritionValidator()).When(x => x.Nutrition is not null);
    }
}

// ----- Tạo mới (FR-RCP-003) -----
public record CreateRecipeCommand(
    string Title, string Description, Guid CategoryId, int PrepTime, int CookTime, int Servings,
    RecipeDifficulty Difficulty, string? Instructions, NutritionInput? Nutrition,
    List<IngredientInput>? Ingredients, List<StepInput>? Steps) : IRequest<RecipeDetailDto>, IRecipeFields;

public class CreateRecipeValidator : AbstractValidator<CreateRecipeCommand>
{
    public CreateRecipeValidator()
    {
        Include(new RecipeFieldsValidator());
        RuleFor(x => x.Ingredients).Must(list => list is null || list.Count <= 100).WithMessage("Tối đa 100 nguyên liệu.");
        RuleFor(x => x.Steps).Must(list => list is null || list.Count <= 100).WithMessage("Tối đa 100 bước.");
        RuleForEach(x => x.Ingredients).NotNull().SetValidator(new IngredientInputValidator());
        RuleForEach(x => x.Steps).NotNull().SetValidator(new StepInputValidator());
        RuleFor(x => x.Steps)
            .Must(list => list!.Where(s => s?.StepNumber is not null).GroupBy(s => s.StepNumber).All(g => g.Count() == 1))
            .WithMessage("stepNumber không được trùng nhau.")
            .When(x => x.Steps is not null);
    }
}

public class CreateRecipeHandler(IUnitOfWork unitOfWork, ICurrentUser currentUser, RecipeDetailReader reader)
    : IRequestHandler<CreateRecipeCommand, RecipeDetailDto>
{
    public async Task<RecipeDetailDto> Handle(CreateRecipeCommand request, CancellationToken cancellationToken)
    {
        await RecipeRules.EnsureCategoryAsync(unitOfWork, request.CategoryId, cancellationToken);

        // Slug dài tối đa 220, chừa chỗ cho hậu tố khi trùng.
        var baseSlug = SlugHelper.Generate(request.Title);
        if (baseSlug.Length > 200) baseSlug = baseSlug[..200].TrimEnd('-');
        if (baseSlug == "search") baseSlug = "search-recipe"; // tránh trùng đường dẫn /recipes/search

        var slug = baseSlug;
        for (var i = 2; await unitOfWork.Recipes.SlugExistsAsync(slug, cancellationToken); i++)
            slug = $"{baseSlug}-{i}";

        var recipe = Recipe.Create(request.Title, request.Description, request.Instructions ?? string.Empty,
            request.CategoryId, currentUser.UserId!, request.PrepTime, request.CookTime, request.Servings,
            request.Difficulty, slug);
        recipe.SetNutrition(request.Nutrition?.ToEntity());

        foreach (var i in request.Ingredients ?? [])
            recipe.AddIngredient(i.Name.Trim(), i.Quantity, i.Unit, i.Notes, i.OrderIndex);
        // Sắp theo stepNumber nếu có (không có thì lấy vị trí gửi lên), sau đó đánh số liên tục từ 1.
        var steps = (request.Steps ?? [])
            .Select((step, index) => (step, position: step.StepNumber ?? index + 1))
            .OrderBy(x => x.position)
            .Select(x => x.step);
        foreach (var s in steps)
            recipe.AddStep(s.Title.Trim(), s.Description, s.TimerMinutes, s.ImageUrl);

        await unitOfWork.Recipes.AddAsync(recipe, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return (await reader.ReadAsync(recipe.Slug, cancellationToken)).Dto;
    }
}

internal static class RecipeRules
{
    public static async Task EnsureCategoryAsync(IUnitOfWork unitOfWork, Guid categoryId, CancellationToken token)
    {
        if (await unitOfWork.Categories.GetByIdAsync(categoryId, token) is null)
            throw new BusinessRuleException(ErrorCodes.CategoryNotFound, "Danh mục không hợp lệ.");
    }
}

// ----- Cập nhật (FR-RCP-004) -----
public record UpdateRecipeCommand(
    Guid Id, string Title, string Description, Guid CategoryId, int PrepTime, int CookTime, int Servings,
    RecipeDifficulty Difficulty, string? Instructions, NutritionInput? Nutrition, string? RowVersion)
    : IRequest<RecipeDetailDto>, IRecipeFields;

public class UpdateRecipeValidator : AbstractValidator<UpdateRecipeCommand>
{
    public UpdateRecipeValidator()
    {
        Include(new RecipeFieldsValidator());
        RuleFor(x => x.RowVersion).NotEmpty().WithMessage("Thiếu rowVersion (header If-Match hoặc trong body).");
    }
}

public class UpdateRecipeHandler(IUnitOfWork unitOfWork, RecipeAccess access, RecipeDetailReader reader)
    : IRequestHandler<UpdateRecipeCommand, RecipeDetailDto>
{
    public async Task<RecipeDetailDto> Handle(UpdateRecipeCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.Id, cancellationToken);

        if (Convert.ToBase64String(recipe.RowVersion) != request.RowVersion)
            throw new ConflictException(ErrorCodes.ConcurrencyConflict, "Dữ liệu đã bị người khác thay đổi.");

        await RecipeRules.EnsureCategoryAsync(unitOfWork, request.CategoryId, cancellationToken);

        // Slug giữ nguyên để không làm hỏng liên kết đã chia sẻ.
        recipe.Update(request.Title, request.Description, request.Instructions ?? string.Empty, request.CategoryId,
            request.PrepTime, request.CookTime, request.Servings, request.Difficulty);
        if (request.Nutrition is not null) recipe.SetNutrition(request.Nutrition.ToEntity());

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return (await reader.ReadAsync(recipe.Slug, cancellationToken)).Dto;
    }
}

// ----- Xuất bản, hủy xuất bản, lưu trữ (FR-RCP-005, 006) -----
public enum RecipeAction { Publish, Unpublish, Archive }

public record ChangeRecipeStatusCommand(Guid Id, RecipeAction Action) : IRequest<RecipeDetailDto>;

public class ChangeRecipeStatusHandler(IUnitOfWork unitOfWork, RecipeAccess access, RecipeDetailReader reader)
    : IRequestHandler<ChangeRecipeStatusCommand, RecipeDetailDto>
{
    public async Task<RecipeDetailDto> Handle(ChangeRecipeStatusCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.Id, cancellationToken);

        switch (request.Action)
        {
            case RecipeAction.Publish: recipe.Publish(DateTime.UtcNow); break;
            case RecipeAction.Unpublish: recipe.Unpublish(); break;
            default: recipe.Archive(); break;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return (await reader.ReadAsync(recipe.Slug, cancellationToken)).Dto;
    }
}

// ----- Xóa (FR-RCP-007) -----
public record DeleteRecipeCommand(Guid Id) : IRequest;

public class DeleteRecipeHandler(IUnitOfWork unitOfWork, RecipeAccess access) : IRequestHandler<DeleteRecipeCommand>
{
    public async Task Handle(DeleteRecipeCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.Id, cancellationToken);
        recipe.IsDeleted = true; // xóa mềm theo NFR-REL-003, có thể khôi phục
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
