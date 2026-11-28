using System.Collections.Concurrent;
using System.Net;
using System.Text.RegularExpressions;

namespace CulinaryBlog.Infrastructure.Email;

/// <summary>
/// Dựng email từ file HTML nhúng trong assembly (thư mục Email/Templates).
/// Chỗ trống {{Ten}} được thay bằng giá trị đã mã hóa HTML để chặn chèn mã qua tên người dùng.
/// </summary>
public static partial class EmailTemplates
{
    private static readonly ConcurrentDictionary<string, string> Cache = new();

    [GeneratedRegex(@"\{\{(\w+)\}\}")]
    private static partial Regex Placeholder();

    /// <summary>Ghép nội dung template vào khung chung _layout.html.</summary>
    public static string Render(string template, string subject, string preheader, IReadOnlyDictionary<string, string> values)
    {
        var body = Fill(Load(template), values);
        var layoutValues = new Dictionary<string, string>(values)
        {
            ["Subject"] = subject,
            ["Preheader"] = preheader
        };

        // Body đã được mã hóa ở bước trên nên chèn nguyên văn vào khung.
        return Fill(Load("_layout"), layoutValues).Replace("{{Body}}", body, StringComparison.Ordinal);
    }

    private static string Fill(string html, IReadOnlyDictionary<string, string> values)
        => Placeholder().Replace(html, m => m.Groups[1].Value == "Body"
            ? m.Value
            : values.TryGetValue(m.Groups[1].Value, out var value) ? WebUtility.HtmlEncode(value) : string.Empty);

    private static string Load(string name) => Cache.GetOrAdd(name, static n =>
    {
        var assembly = typeof(EmailTemplates).Assembly;
        var resource = $"{assembly.GetName().Name}.Email.Templates.{n}.html";
        using var stream = assembly.GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException($"Không tìm thấy template email '{resource}'.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    });
}
