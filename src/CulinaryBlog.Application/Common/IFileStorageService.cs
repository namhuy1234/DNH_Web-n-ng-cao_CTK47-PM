namespace CulinaryBlog.Application.Common;

public interface IFileStorageService
{
    /// <summary>Lưu file với tên ngẫu nhiên, trả về đường dẫn công khai.</summary>
    Task<string> SaveAsync(Stream content, string folder, string extension, CancellationToken cancellationToken);
    void Delete(string url);
}
