using CulinaryBlog.Application.Common;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Recipes;

public record UploadImageCommand(
    Guid RecipeId, Stream Content, long Length, string ContentType, string? AltText, bool IsPrimary)
    : IRequest<ImageDto>;

public record UpdateImageCommand(Guid RecipeId, Guid ImageId, string? AltText, bool? IsPrimary, int? OrderIndex)
    : IRequest<ImageDto>;

public record DeleteImageCommand(Guid RecipeId, Guid ImageId) : IRequest;

public class UploadImageValidator : AbstractValidator<UploadImageCommand>
{
    public UploadImageValidator() => RuleFor(x => x.AltText).MaximumLength(200);
}

public class UpdateImageValidator : AbstractValidator<UpdateImageCommand>
{
    public UpdateImageValidator()
    {
        RuleFor(x => x.AltText).MaximumLength(200);
        RuleFor(x => x.OrderIndex).GreaterThanOrEqualTo(0);
    }
}

/// <summary>Kiểm tra loại file bằng các byte đầu (magic bytes), không tin vào tên hay Content-Type.</summary>
public static class ImageFile
{
    public const long MaxBytes = 5 * 1024 * 1024;

    private static readonly Dictionary<string, string> Extensions = new()
    {
        ["image/jpeg"] = ".jpg", ["image/png"] = ".png", ["image/webp"] = ".webp", ["image/avif"] = ".avif"
    };

    public static async Task<string> ValidateAsync(
        Stream content, long length, string contentType, CancellationToken cancellationToken)
    {
        if (length > MaxBytes)
            throw new BadRequestException(ErrorCodes.FileSizeExceeded, "Kích thước file vượt quá giới hạn 5MB.");
        if (!Extensions.TryGetValue(contentType, out var extension))
            throw new BadRequestException(ErrorCodes.FileMimeInvalid, "Chỉ chấp nhận JPEG, PNG, WebP, AVIF.");

        var header = new byte[12];
        var read = await content.ReadAtLeastAsync(header, header.Length, false, cancellationToken);
        content.Position = 0;

        var valid = read == header.Length && contentType switch
        {
            "image/jpeg" => header.AsSpan(0, 3).SequenceEqual(new byte[] { 0xFF, 0xD8, 0xFF }),
            "image/png" => header.AsSpan(0, 8).SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            "image/webp" => header.AsSpan(0, 4).SequenceEqual("RIFF"u8) && header.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => header.AsSpan(4, 4).SequenceEqual("ftyp"u8)
                 && (header.AsSpan(8, 4).SequenceEqual("avif"u8) || header.AsSpan(8, 4).SequenceEqual("avis"u8))
        };

        return valid ? extension : throw new BadRequestException(ErrorCodes.FileMimeInvalid, "File không hợp lệ.");
    }
}

public class ImageHandlers(IUnitOfWork unitOfWork, RecipeAccess access, IFileStorageService storage) :
    IRequestHandler<UploadImageCommand, ImageDto>,
    IRequestHandler<UpdateImageCommand, ImageDto>,
    IRequestHandler<DeleteImageCommand>
{
    public async Task<ImageDto> Handle(UploadImageCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.RecipeId, cancellationToken);
        var extension = await ImageFile.ValidateAsync(
            request.Content, request.Length, request.ContentType, cancellationToken);
        var url = await storage.SaveAsync(request.Content, $"recipes/{recipe.Id}", extension, cancellationToken);

        RecipeImage image = null!;
        try
        {
            await unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                image = recipe.AddImage(url, request.AltText);
                recipe.Touch();
                await unitOfWork.SaveChangesAsync(cancellationToken);

                if (request.IsPrimary && !image.IsPrimary)
                    await MakePrimaryAsync(recipe, image, cancellationToken);
            }, cancellationToken);
        }
        catch
        {
            storage.Delete(url); // lưu database lỗi thì không để file mồ côi
            throw;
        }

        return image.ToDto();
    }

    public async Task<ImageDto> Handle(UpdateImageCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.RecipeId, cancellationToken);
        var image = recipe.GetImage(request.ImageId);

        if (request.IsPrimary == false && image.IsPrimary)
            throw new BusinessRuleException(ErrorCodes.ValidationError, "Hãy đặt ảnh khác làm ảnh chính thay vì bỏ ảnh chính.");

        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            image.Update(request.AltText ?? image.AltText, request.OrderIndex ?? image.OrderIndex);
            recipe.Touch();
            await unitOfWork.SaveChangesAsync(cancellationToken);

            if (request.IsPrimary == true && !image.IsPrimary)
                await MakePrimaryAsync(recipe, image, cancellationToken);
        }, cancellationToken);

        return image.ToDto();
    }

    public async Task Handle(DeleteImageCommand request, CancellationToken cancellationToken)
    {
        var recipe = await access.GetOwnedAsync(request.RecipeId, cancellationToken);
        var image = recipe.GetImage(request.ImageId);

        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            recipe.RemoveImage(image);
            recipe.Touch();
            await unitOfWork.SaveChangesAsync(cancellationToken);

            // Xóa ảnh chính thì ảnh còn lại đầu tiên lên thay.
            var next = recipe.Images.OrderBy(i => i.OrderIndex).FirstOrDefault();
            if (image.IsPrimary && next is not null)
                await MakePrimaryAsync(recipe, next, cancellationToken);
        }, cancellationToken);

        storage.Delete(image.OriginalUrl);
    }

    // Bỏ cờ cũ và lưu trước để không vi phạm index "mỗi công thức một ảnh chính".
    private async Task MakePrimaryAsync(Recipe recipe, RecipeImage image, CancellationToken cancellationToken)
    {
        foreach (var other in recipe.Images.Where(i => i.IsPrimary))
            other.SetPrimary(false);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        image.SetPrimary(true);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
