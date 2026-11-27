namespace CulinaryBlog.Application.Common;

public interface IUserReader
{
    Task<IReadOnlyDictionary<string, string>> GetDisplayNamesAsync(
        IEnumerable<string> userIds, CancellationToken cancellationToken = default);
}
