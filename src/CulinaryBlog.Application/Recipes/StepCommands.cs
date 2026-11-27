using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Recipes;

public record StepInput(string Title, string Description, int? TimerMinutes, string? ImageUrl, int? StepNumber);

public class StepInputValidator : AbstractValidator<StepInput>
{
    public StepInputValidator()
    {
        RuleFor(x => (x.Title ?? string.Empty).Trim())
            .Length(1, 200).WithMessage("Tên bước dài từ 1 đến 200 ký tự.")
            .OverridePropertyName(nameof(StepInput.Title));
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000).WithMessage("Mô tả bắt buộc, tối đa 2000 ký tự.");
        RuleFor(x => x.TimerMinutes).InclusiveBetween(0, 10_000);
        RuleFor(x => x.ImageUrl).MaximumLength(500);
        RuleFor(x => x.StepNumber).InclusiveBetween(1, 1000);
    }
}

public record AddStepCommand(Guid RecipeId, StepInput Input) : IRequest<StepDto>;
public record UpdateStepCommand(Guid RecipeId, Guid StepId, StepInput Input) : IRequest<StepDto>;
public record DeleteStepCommand(Guid RecipeId, Guid StepId) : IRequest;

public class AddStepValidator : AbstractValidator<AddStepCommand>
{
    public AddStepValidator() => RuleFor(x => x.Input).SetValidator(new StepInputValidator());
}

public class UpdateStepValidator : AbstractValidator<UpdateStepCommand>
{
    public UpdateStepValidator() => RuleFor(x => x.Input).SetValidator(new StepInputValidator());
}

public class StepHandlers(IUnitOfWork unitOfWork, RecipeAccess access) :
    IRequestHandler<AddStepCommand, StepDto>,
    IRequestHandler<UpdateStepCommand, StepDto>,
    IRequestHandler<DeleteStepCommand>
{
    public async Task<StepDto> Handle(AddStepCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.RecipeId, cancellationToken);
        var input = request.Input;
        RecipeStep step = null!;

        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            step = recipe.AddStep(input.Title.Trim(), input.Description, input.TimerMinutes, input.ImageUrl);
            recipe.Touch();
            await unitOfWork.SaveChangesAsync(cancellationToken);

            // Client muốn chèn vào giữa thì sắp lại sau khi đã thêm.
            if (input.StepNumber is { } position && position < step.StepNumber)
                await ReorderAsync(recipe, step, position, cancellationToken);
        }, cancellationToken);

        return step.ToDto();
    }

    public async Task<StepDto> Handle(UpdateStepCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.RecipeId, cancellationToken);
        var step = recipe.GetStep(request.StepId);
        var input = request.Input;

        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            step.Update(input.Title.Trim(), input.Description, input.TimerMinutes, input.ImageUrl);
            recipe.Touch();
            await unitOfWork.SaveChangesAsync(cancellationToken);

            if (input.StepNumber is { } position && position != step.StepNumber)
                await ReorderAsync(recipe, step, position, cancellationToken);
        }, cancellationToken);

        return step.ToDto();
    }

    public async Task Handle(DeleteStepCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.RecipeId, cancellationToken);
        recipe.RemoveStep(recipe.GetStep(request.StepId)); // tự đánh số lại
        recipe.Touch();
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    // Index unique (RecipeId, StepNumber) không cho đổi chỗ trực tiếp: đánh số tạm rồi mới đánh số thật.
    private async Task ReorderAsync(Recipe recipe, RecipeStep step, int position, CancellationToken cancellationToken)
    {
        var ordered = recipe.OrderWithStepMovedTo(step, position);

        Recipe.Renumber(ordered, offset: 100_000);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        Recipe.Renumber(ordered);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
