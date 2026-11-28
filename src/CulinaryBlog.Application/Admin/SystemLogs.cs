using System.Globalization;
using CulinaryBlog.Domain.Exceptions;
using FluentValidation;
using MediatR;

namespace CulinaryBlog.Application.Admin;

public record LogEntryDto(
    DateTimeOffset Timestamp, string Level, string Message, string? Exception, string? SourceContext,
    string? CorrelationId, string? UserId, string? RequestMethod, string? RequestPath, int? StatusCode, double? ElapsedMs);

public record LogFileDto(DateOnly Date, long SizeBytes);

/// <summary>MinLevel: chỉ lấy bản ghi từ mức này trở lên (Warning gồm cả Error, Fatal).</summary>
public record LogQuery(DateOnly Date, string? MinLevel, string? Keyword, int Take);

public record LogPageDto(
    DateOnly Date, IReadOnlyList<LogEntryDto> Items, int TotalMatched, IReadOnlyDictionary<string, int> LevelCounts);

/// <summary>Đọc nhật ký hệ thống do Serilog ghi ra file (mỗi ngày một file JSON).</summary>
public interface ISystemLogReader
{
    IReadOnlyList<LogFileDto> ListFiles();
    Task<LogPageDto> ReadAsync(LogQuery query, CancellationToken cancellationToken);
}

public static class LogLevels
{
    /// <summary>Thứ tự mức log của Serilog, từ thấp đến cao.</summary>
    public static readonly string[] All = ["Verbose", "Debug", "Information", "Warning", "Error", "Fatal"];

    public static int Rank(string level) => Array.IndexOf(All, level);

    /// <summary>Ngày hiện tại theo múi giờ của máy chủ, trùng với ngày trong tên file nhật ký.</summary>
    public static DateOnly LocalToday(TimeProvider clock)
        => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.GetUtcNow(), clock.LocalTimeZone).DateTime);
}

// ----- Danh sách ngày có nhật ký -----
public record GetLogFilesQuery : IRequest<IReadOnlyList<LogFileDto>>;

public class GetLogFilesHandler(ISystemLogReader reader) : IRequestHandler<GetLogFilesQuery, IReadOnlyList<LogFileDto>>
{
    public Task<IReadOnlyList<LogFileDto>> Handle(GetLogFilesQuery request, CancellationToken cancellationToken)
        => Task.FromResult(reader.ListFiles());
}

// ----- Đọc nhật ký một ngày -----
public record GetSystemLogsQuery(string? Date, string? Level, string? Q, int Take) : IRequest<LogPageDto>;

public class GetSystemLogsValidator : AbstractValidator<GetSystemLogsQuery>
{
    public GetSystemLogsValidator()
    {
        RuleFor(x => x.Level).Must(l => l is null || LogLevels.All.Contains(l))
            .WithMessage($"level chỉ nhận: {string.Join(", ", LogLevels.All)}.");
        RuleFor(x => x.Q).MaximumLength(200).WithMessage("Từ khóa tối đa 200 ký tự.");
        RuleFor(x => x.Take).InclusiveBetween(1, 1000).WithMessage("take phải từ 1 đến 1000.");
    }
}

public class GetSystemLogsHandler(ISystemLogReader reader, TimeProvider clock)
    : IRequestHandler<GetSystemLogsQuery, LogPageDto>
{
    public Task<LogPageDto> Handle(GetSystemLogsQuery request, CancellationToken cancellationToken)
    {
        // Mặc định đọc nhật ký hôm nay. Serilog đặt tên file theo giờ địa phương của máy chủ (DateTime.Now),
        // nên "hôm nay" cũng phải tính theo giờ địa phương; dùng giờ UTC thì 0h-7h sáng (UTC+7) sẽ đọc nhầm file hôm qua.
        var date = LogLevels.LocalToday(clock);
        if (!string.IsNullOrEmpty(request.Date) &&
            !DateOnly.TryParseExact(request.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
            throw new BadRequestException(ErrorCodes.LogDateInvalid, "date phải có dạng yyyy-MM-dd.");

        return reader.ReadAsync(new LogQuery(date, request.Level, request.Q, request.Take), cancellationToken);
    }
}
