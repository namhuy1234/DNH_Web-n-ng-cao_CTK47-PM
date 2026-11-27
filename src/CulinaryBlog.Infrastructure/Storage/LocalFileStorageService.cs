using CulinaryBlog.Application.Common;
using Microsoft.Extensions.Configuration;

namespace CulinaryBlog.Infrastructure.Storage;

/// <summary>Lưu ảnh trên đĩa cho môi trường phát triển (SRS 2.6.2). Sẽ thay bằng MinIO sau.</summary>
public class LocalFileStorageService(IConfiguration configuration) : IFileStorageService
{
    private readonly string _root = Path.GetFullPath(configuration["Storage:Root"] ?? "uploads");

    public async Task<string> SaveAsync(
        Stream content, string folder, string extension, CancellationToken cancellationToken)
    {
        var name = $"{Guid.NewGuid():N}{extension}";
        var directory = Path.Combine(_root, folder);
        Directory.CreateDirectory(directory);

        await using var file = File.Create(Path.Combine(directory, name));
        await content.CopyToAsync(file, cancellationToken);

        return $"/uploads/{folder.Replace('\\', '/')}/{name}";
    }

    public void Delete(string url)
    {
        if (!url.StartsWith("/uploads/", StringComparison.Ordinal)) return;

        var path = Path.GetFullPath(Path.Combine(_root, url["/uploads/".Length..]));
        // Chỉ xóa file nằm trong thư mục lưu trữ; không có file thì bỏ qua.
        if (path.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) && File.Exists(path))
            File.Delete(path);
    }
}
