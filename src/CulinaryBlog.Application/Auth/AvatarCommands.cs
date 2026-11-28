using CulinaryBlog.Application.Common;
using CulinaryBlog.Application.Recipes;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Application.Auth;

public static class AvatarRules
{
    public const string Folder = "avatars";

    /// <summary>Ảnh đại diện đã tải lên máy chủ có dạng /uploads/avatars/...</summary>
    public static bool IsUploaded(string url)
        => url.StartsWith($"/uploads/{Folder}/", StringComparison.Ordinal) && !url.Contains("..", StringComparison.Ordinal);
}

/// <summary>Tải ảnh đại diện (multipart). Dùng chung quy tắc kiểm tra ảnh với ảnh công thức.</summary>
public record UploadAvatarCommand(Stream Content, long Length, string ContentType) : IRequest<UserProfileDto>;

public class UploadAvatarHandler(
    IIdentityService identity, ICurrentUser currentUser, IFileStorageService storage, ILogger<UploadAvatarHandler> logger)
    : IRequestHandler<UploadAvatarCommand, UserProfileDto>
{
    public async Task<UserProfileDto> Handle(UploadAvatarCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId!;
        var extension = await ImageFile.ValidateAsync(
            request.Content, request.Length, request.ContentType, cancellationToken);
        var url = await storage.SaveAsync(request.Content, $"{AvatarRules.Folder}/{userId}", extension, cancellationToken);

        UserProfileDto profile;
        string? old;
        try
        {
            (profile, old) = await identity.SetAvatarAsync(userId, url);
        }
        catch
        {
            storage.Delete(url); // không lưu được hồ sơ thì xóa file vừa ghi
            throw;
        }

        // Ảnh cũ do máy chủ lưu thì xóa luôn; ảnh từ địa chỉ ngoài thì bỏ qua.
        if (old is not null && AvatarRules.IsUploaded(old))
            storage.Delete(old);

        logger.LogInformation("Người dùng {UserId} đổi ảnh đại diện ({Bytes} byte)", userId, request.Length);
        return profile;
    }
}
