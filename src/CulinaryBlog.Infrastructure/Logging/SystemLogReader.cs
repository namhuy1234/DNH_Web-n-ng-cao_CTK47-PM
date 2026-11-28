using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using CulinaryBlog.Application.Admin;
using Microsoft.Extensions.Configuration;

namespace CulinaryBlog.Infrastructure.Logging;

/// <summary>
/// Đọc file nhật ký dạng Compact JSON của Serilog (mỗi dòng một bản ghi: @t, @l, @m, @x và các thuộc tính).
/// Tên file: culinary-yyyyMMdd.json, khi vượt dung lượng thì thêm _001, _002...
/// </summary>
public partial class SystemLogReader(IConfiguration configuration) : ISystemLogReader
{
    public const string FilePrefix = "culinary-";

    private readonly string _directory = Path.GetFullPath(configuration["Logs:Directory"] ?? "logs");

    [GeneratedRegex(@"^culinary-(\d{8})(?:_\d{3})?\.json$")]
    private static partial Regex FileNamePattern();

    public IReadOnlyList<LogFileDto> ListFiles()
    {
        if (!Directory.Exists(_directory)) return [];

        return Directory.EnumerateFiles(_directory, $"{FilePrefix}*.json")
            .Select(path => (path, match: FileNamePattern().Match(Path.GetFileName(path))))
            .Where(x => x.match.Success)
            .GroupBy(x => DateOnly.ParseExact(x.match.Groups[1].Value, "yyyyMMdd", CultureInfo.InvariantCulture))
            .Select(g => new LogFileDto(g.Key, g.Sum(x => new FileInfo(x.path).Length)))
            .OrderByDescending(f => f.Date)
            .ToList();
    }

    public async Task<LogPageDto> ReadAsync(LogQuery query, CancellationToken cancellationToken)
    {
        var minRank = query.MinLevel is null ? 0 : LogLevels.Rank(query.MinLevel);
        var counts = LogLevels.All.ToDictionary(l => l, _ => 0);
        // Giữ N bản ghi mới nhất bằng hàng đợi vòng, không nạp toàn bộ file vào bộ nhớ.
        var newest = new Queue<LogEntryDto>(query.Take);
        var matched = 0;

        foreach (var path in FilesFor(query.Date))
        {
            // Serilog vẫn đang mở file để ghi nên phải mở với FileShare.ReadWrite.
            await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read,
                FileShare.ReadWrite | FileShare.Delete);
            using var reader = new StreamReader(stream);

            while (await reader.ReadLineAsync(cancellationToken) is { } line)
            {
                if (Parse(line) is not { } entry) continue;

                counts[entry.Level] = counts.GetValueOrDefault(entry.Level) + 1;
                if (LogLevels.Rank(entry.Level) < minRank || !Contains(entry, query.Keyword)) continue;

                matched++;
                if (newest.Count == query.Take) newest.Dequeue();
                newest.Enqueue(entry);
            }
        }

        return new LogPageDto(query.Date, newest.Reverse().ToList(), matched, counts);
    }

    private IEnumerable<string> FilesFor(DateOnly date)
    {
        if (!Directory.Exists(_directory)) return [];

        var stem = FilePrefix + date.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
        // File gốc trước, các phần _001, _002 sau, đúng thứ tự thời gian ghi.
        return Directory.EnumerateFiles(_directory, $"{stem}*.json")
            .Where(p => FileNamePattern().IsMatch(Path.GetFileName(p)))
            .OrderBy(p => Path.GetFileName(p).Length).ThenBy(p => p, StringComparer.Ordinal);
    }

    private static bool Contains(LogEntryDto e, string? keyword)
    {
        if (string.IsNullOrWhiteSpace(keyword)) return true;

        return new[] { e.Message, e.Exception, e.RequestPath, e.CorrelationId, e.UserId, e.SourceContext }
            .Any(v => v?.Contains(keyword.Trim(), StringComparison.OrdinalIgnoreCase) == true);
    }

    /// <summary>Đọc một dòng Compact JSON; dòng hỏng (đang ghi dở) thì bỏ qua.</summary>
    public static LogEntryDto? Parse(string line)
    {
        if (string.IsNullOrWhiteSpace(line)) return null;

        try
        {
            using var doc = JsonDocument.Parse(line);
            var root = doc.RootElement;
            if (!root.TryGetProperty("@t", out var t) || !t.TryGetDateTimeOffset(out var timestamp)) return null;

            // Serilog bỏ trường @l khi mức là Information.
            var level = Text(root, "@l") ?? "Information";
            if (LogLevels.Rank(level) < 0) level = "Information";

            return new LogEntryDto(
                timestamp, level,
                Render(root) ?? Text(root, "@m") ?? string.Empty,
                Text(root, "@x"),
                Text(root, "SourceContext"),
                Text(root, "CorrelationId"),
                Text(root, "UserId"),
                Text(root, "RequestMethod"),
                Text(root, "RequestPath"),
                root.TryGetProperty("StatusCode", out var s) && s.TryGetInt32(out var status) ? status : null,
                root.TryGetProperty("Elapsed", out var el) && el.TryGetDouble(out var elapsed) ? Math.Round(elapsed, 1) : null);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    [GeneratedRegex(@"\{\{|\}\}|\{[@$]?(\w+)(?:,[^:}]*)?(?::([^}]*))?\}")]
    private static partial Regex Token();

    /// <summary>
    /// Dựng câu từ message template (@mt) và thuộc tính. Chuỗi được chèn nguyên văn (không bọc ngoặc kép
    /// như cách Serilog render mặc định); token có định dạng (ví dụ {Elapsed:0.0}) lấy giá trị đã định dạng
    /// sẵn trong mảng @r theo đúng thứ tự xuất hiện.
    /// </summary>
    private static string? Render(JsonElement root)
    {
        if (Text(root, "@mt") is not { } template) return null;

        var renderings = root.TryGetProperty("@r", out var r) && r.ValueKind == JsonValueKind.Array
            ? r.EnumerateArray().Select(x => x.GetString() ?? "").ToList()
            : [];
        var next = 0;

        return Token().Replace(template, m =>
        {
            if (m.Value == "{{") return "{";
            if (m.Value == "}}") return "}";
            if (m.Groups[2].Success && next < renderings.Count) return renderings[next++];
            return Text(root, m.Groups[1].Value) ?? m.Value;
        });
    }

    private static string? Text(JsonElement root, string name)
        => root.TryGetProperty(name, out var value)
            ? value.ValueKind == JsonValueKind.String ? value.GetString() : value.GetRawText()
            : null;
}
