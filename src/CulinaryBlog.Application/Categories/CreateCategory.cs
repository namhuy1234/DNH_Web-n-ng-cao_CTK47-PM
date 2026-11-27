using CulinaryBlog.Domain.Common;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Categories;

public record CreateCategoryCommand(string Name, string? Description) : IRequest<CategoryDto>;

public class CreateCategoryValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryValidator()
    {
        // Kiểm tra trên tên đã cắt dấu cách, đúng với giá trị sẽ được lưu.
        RuleFor(x => (x.Name ?? string.Empty).Trim())
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Tên danh mục không được để trống.")
            .Length(2, 50).WithMessage("Tên danh mục dài từ 2 đến 50 ký tự.")
            .Must(name => !name.Contains('<') && !name.Contains('>')).WithMessage("Tên danh mục không được chứa HTML.")
            .Must(name => SlugHelper.Generate(name).Length > 0).WithMessage("Tên danh mục phải có chữ hoặc số.")
            .OverridePropertyName(nameof(CreateCategoryCommand.Name));

        RuleFor(x => x.Description).MaximumLength(2000).WithMessage("Mô tả tối đa 2000 ký tự.");
    }
}

public class CreateCategoryHandler(IUnitOfWork unitOfWork) : IRequestHandler<CreateCategoryCommand, CategoryDto>
{
    public async Task<CategoryDto> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();

        if (await unitOfWork.Categories.NameExistsAsync(name, cancellationToken: cancellationToken))
            throw new ConflictException(ErrorCodes.CategoryNameExists, $"Danh mục '{name}' đã tồn tại.");

        // Trùng slug thì thêm hậu tố -2, -3...
        var baseSlug = SlugHelper.Generate(name);
        var slug = baseSlug;
        for (var i = 2; await unitOfWork.Categories.SlugExistsAsync(slug, cancellationToken); i++)
            slug = $"{baseSlug}-{i}";

        var category = Category.Create(name, request.Description, slug: slug);
        await unitOfWork.Categories.AddAsync(category, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new CategoryDto(category.Id, category.Name, category.Slug, category.Description, category.ImageUrl, 0);
    }
}
