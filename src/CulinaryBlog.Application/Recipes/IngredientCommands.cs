using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Recipes;

public record IngredientInput(string Name, decimal? Quantity, string? Unit, string? Notes, int? OrderIndex);

public class IngredientInputValidator : AbstractValidator<IngredientInput>
{
    public IngredientInputValidator()
    {
        RuleFor(x => (x.Name ?? string.Empty).Trim())
            .Length(1, 200).WithMessage("Tên nguyên liệu dài từ 1 đến 200 ký tự.")
            .OverridePropertyName(nameof(IngredientInput.Name));
        RuleFor(x => x.Quantity).GreaterThan(0).LessThan(10_000_000).WithMessage("quantity phải lớn hơn 0.");
        RuleFor(x => x.Unit).MaximumLength(50);
        RuleFor(x => x.Notes).MaximumLength(500);
        RuleFor(x => x.OrderIndex).GreaterThanOrEqualTo(0);
    }
}

public record AddIngredientCommand(Guid RecipeId, IngredientInput Input) : IRequest<IngredientDto>;
public record UpdateIngredientCommand(Guid RecipeId, Guid IngredientId, IngredientInput Input) : IRequest<IngredientDto>;
public record DeleteIngredientCommand(Guid RecipeId, Guid IngredientId) : IRequest;

public class AddIngredientValidator : AbstractValidator<AddIngredientCommand>
{
    public AddIngredientValidator() => RuleFor(x => x.Input).SetValidator(new IngredientInputValidator());
}

public class UpdateIngredientValidator : AbstractValidator<UpdateIngredientCommand>
{
    public UpdateIngredientValidator() => RuleFor(x => x.Input).SetValidator(new IngredientInputValidator());
}

public class IngredientHandlers(IUnitOfWork unitOfWork, RecipeAccess access) :
    IRequestHandler<AddIngredientCommand, IngredientDto>,
    IRequestHandler<UpdateIngredientCommand, IngredientDto>,
    IRequestHandler<DeleteIngredientCommand>
{
    public async Task<IngredientDto> Handle(AddIngredientCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.RecipeId, cancellationToken);
        var i = request.Input;
        var ingredient = recipe.AddIngredient(i.Name.Trim(), i.Quantity, i.Unit, i.Notes, i.OrderIndex);
        recipe.Touch();
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return ingredient.ToDto();
    }

    public async Task<IngredientDto> Handle(UpdateIngredientCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.RecipeId, cancellationToken);
        var ingredient = recipe.GetIngredient(request.IngredientId);
        var i = request.Input;
        ingredient.Update(i.Name.Trim(), i.Quantity, i.Unit, i.Notes, i.OrderIndex ?? ingredient.OrderIndex);
        recipe.Touch();
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return ingredient.ToDto();
    }

    public async Task Handle(DeleteIngredientCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.RecipeId, cancellationToken);
        recipe.RemoveIngredient(recipe.GetIngredient(request.IngredientId));
        recipe.Touch();
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
