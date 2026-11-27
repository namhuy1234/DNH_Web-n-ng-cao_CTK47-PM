using System.Globalization;
using System.Text;

namespace CulinaryBlog.Domain.Common;

/// <summary>Sinh slug: chữ thường, bỏ dấu tiếng Việt, nối bằng dấu gạch ngang.</summary>
public static class SlugHelper
{
    public static string Generate(string text)
    {
        var normalized = text.Trim().ToLowerInvariant().Replace('đ', 'd').Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
                continue;

            if (char.IsAsciiLetterOrDigit(c))
                builder.Append(c);
            else if (builder.Length > 0 && builder[^1] != '-')
                builder.Append('-');
        }

        return builder.ToString().TrimEnd('-');
    }
}
