using System.Text;
using CulinaryBlog.Application.Admin;
using CulinaryBlog.Application.Auth;
using CulinaryBlog.Application.Common;
using CulinaryBlog.Application.Recipes;
using CulinaryBlog.Application.Users;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Exceptions;
using CulinaryBlog.Domain.Repositories;
using CulinaryBlog.Infrastructure.Email;
using CulinaryBlog.Infrastructure.Identity;
using CulinaryBlog.Infrastructure.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace CulinaryBlog.UnitTests;

/// <summary>Lab 8: kiểm tra ảnh, quyền quản lý, khóa tài khoản, nhật ký, template email.</summary>
public class Lab8Tests
{
    // ---------------------------------------------------------------- ảnh tải lên
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D];
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1];
    private static readonly byte[] Webp = [.. "RIFF"u8, 0, 0, 0, 0, .. "WEBP"u8];

    [Theory]
    [InlineData("png", "image/png", ".png")]
    [InlineData("jpeg", "image/jpeg", ".jpg")]
    [InlineData("webp", "image/webp", ".webp")]
    public async Task Anh_hop_le_tra_ve_duoi_file(string kind, string mime, string extension)
    {
        var bytes = kind switch { "png" => Png, "jpeg" => Jpeg, _ => Webp };
        using var stream = new MemoryStream(bytes);
        Assert.Equal(extension, await ImageFile.ValidateAsync(stream, bytes.Length, mime, CancellationToken.None));
        Assert.Equal(0, stream.Position); // đọc xong phải tua lại để lưu đủ file
    }

    [Fact]
    public async Task Noi_dung_khong_khop_content_type_bi_tu_choi()
    {
        using var stream = new MemoryStream(Jpeg);
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            ImageFile.ValidateAsync(stream, Jpeg.Length, "image/png", CancellationToken.None));
        Assert.Equal(ErrorCodes.FileMimeInvalid, ex.ErrorCode);
    }

    [Theory]
    [InlineData("image/gif")]
    [InlineData("image/svg+xml")] // SVG có thể chứa script nên không nhận
    [InlineData("text/html")]
    public async Task Dinh_dang_ngoai_danh_sach_bi_tu_choi(string mime)
    {
        using var stream = new MemoryStream(Png);
        await Assert.ThrowsAsync<BadRequestException>(() =>
            ImageFile.ValidateAsync(stream, Png.Length, mime, CancellationToken.None));
    }

    [Fact]
    public async Task Anh_qua_5MB_bi_tu_choi()
    {
        using var stream = new MemoryStream(Png);
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            ImageFile.ValidateAsync(stream, ImageFile.MaxBytes + 1, "image/png", CancellationToken.None));
        Assert.Equal(ErrorCodes.FileSizeExceeded, ex.ErrorCode);
    }

    [Theory]
    [InlineData("/uploads/avatars/u1/a.png", true)]
    [InlineData("/uploads/recipes/r1/a.png", false)]   // không phải thư mục ảnh đại diện
    [InlineData("/uploads/avatars/../../appsettings.json", false)]
    [InlineData("javascript:alert(1)", false)]
    public void Duong_dan_anh_dai_dien(string url, bool expected)
        => Assert.Equal(expected, AvatarRules.IsUploaded(url));

    [Theory]
    [InlineData(null, true)]
    [InlineData("https://example.com/a.png", true)]
    [InlineData("/uploads/avatars/u1/a.png", true)]
    [InlineData("ftp://example.com/a.png", false)]
    [InlineData("/etc/passwd", false)]
    public void AvatarUrl_trong_ho_so(string? url, bool valid)
        => Assert.Equal(valid, new UpdateProfileValidator().Validate(new UpdateProfileCommand(null, url, null)).IsValid);

    // ---------------------------------------------------------------- trang quản lý
    [Theory]
    [InlineData(null, "mine", true)]
    [InlineData("Deleted", "mine", true)]
    [InlineData("Published", "all", true)]
    [InlineData("Xoa", "mine", false)]
    [InlineData(null, "tat-ca", false)]
    public void Tham_so_danh_sach_quan_ly(string? status, string scope, bool valid)
        => Assert.Equal(valid,
            new GetManagedRecipesValidator().Validate(new GetManagedRecipesQuery(1, 10, status, null, scope)).IsValid);

    [Fact]
    public void Tac_gia_chi_xem_bai_cua_minh()
    {
        Assert.Equal("u1", RecipeScope.ResolveAuthor("mine", new FakeUser("u1", false)));
        Assert.Throws<ForbiddenException>(() => RecipeScope.ResolveAuthor("all", new FakeUser("u1", false)));
        Assert.Null(RecipeScope.ResolveAuthor("all", new FakeUser("admin", true)));
    }

    // ---------------------------------------------------------------- khóa tài khoản
    [Fact]
    public async Task Admin_khong_the_tu_khoa_minh()
    {
        var (handler, _, _, _) = LockHandler("admin", ("admin", "Admin"));
        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            handler.Handle(new SetUserActiveCommand("admin", false), CancellationToken.None));
        Assert.Equal(ErrorCodes.UserLockForbidden, ex.ErrorCode);
    }

    [Fact]
    public async Task Khong_khoa_duoc_quan_tri_vien_khac()
        => await Assert.ThrowsAsync<BusinessRuleException>(() =>
            LockHandler("admin", ("admin2", "Admin")).Handler.Handle(
                new SetUserActiveCommand("admin2", false), CancellationToken.None));

    [Fact]
    public async Task Khoa_tac_gia_thu_hoi_phien_va_chan_token()
    {
        var (handler, users, tokens, blocklist) = LockHandler("admin", ("u1", "Author"));

        var result = await handler.Handle(new SetUserActiveCommand("u1", false), CancellationToken.None);

        Assert.False(result.IsActive);
        Assert.Equal(["u1"], tokens.RevokedUsers);
        Assert.True(blocklist.IsBlocked("u1"));

        await handler.Handle(new SetUserActiveCommand("u1", true), CancellationToken.None);
        Assert.True(users.Get("u1").IsActive);
        Assert.False(blocklist.IsBlocked("u1"));
    }

    [Fact]
    public void Blocklist_tu_het_han()
    {
        var clock = new ManualClock();
        var blocklist = new AccessBlocklist(clock);
        blocklist.Block("u1");
        Assert.True(blocklist.IsBlocked("u1"));

        clock.Advance(TimeSpan.FromMinutes(21)); // access token (15 phút) chắc chắn đã hết hạn
        Assert.False(blocklist.IsBlocked("u1"));
    }

    // ---------------------------------------------------------------- nhật ký hệ thống
    [Fact]
    public void Doc_dong_log_Compact_JSON()
    {
        const string line = """
            {"@t":"2026-11-27T10:00:00.1234567Z","@m":"HTTP GET /api/v1/recipes trả 200 trong 12.3 ms","@i":"abc",
             "RequestMethod":"GET","RequestPath":"/api/v1/recipes","StatusCode":200,"Elapsed":12.345,
             "CorrelationId":"c0ffee12","UserId":"u1","SourceContext":"Serilog.AspNetCore.RequestLoggingMiddleware"}
            """;
        var entry = SystemLogReader.Parse(line.ReplaceLineEndings(""))!;

        Assert.Equal("Information", entry.Level); // Serilog bỏ @l khi mức là Information
        Assert.Equal(200, entry.StatusCode);
        Assert.Equal(12.3, entry.ElapsedMs);
        Assert.Equal("c0ffee12", entry.CorrelationId);
        Assert.Equal("u1", entry.UserId);
    }

    [Fact]
    public void Dung_cau_tu_template_khong_boc_ngoac_kep()
    {
        const string line = """
            {"@t":"2026-11-27T10:00:00Z","@mt":"HTTP {RequestMethod} {RequestPath} trả {StatusCode} trong {Elapsed:0.0} ms",
             "@r":["12.3"],"RequestMethod":"GET","RequestPath":"/api/v1/recipes","StatusCode":200,"Elapsed":12.345}
            """;
        Assert.Equal("HTTP GET /api/v1/recipes trả 200 trong 12.3 ms", SystemLogReader.Parse(line.ReplaceLineEndings(""))!.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("{\"@t\":\"2026-11-27T10:00")]    // dòng đang ghi dở
    [InlineData("{\"@m\":\"thiếu thời gian\"}")]
    public void Dong_log_hong_bi_bo_qua(string line) => Assert.Null(SystemLogReader.Parse(line));

    [Fact]
    public async Task Loc_log_theo_muc_va_tu_khoa_moi_nhat_truoc()
    {
        var dir = Directory.CreateTempSubdirectory("culinary-logs-");
        try
        {
            var lines = new[]
            {
                """{"@t":"2026-11-27T01:00:00Z","@m":"một"}""",
                """{"@t":"2026-11-27T02:00:00Z","@l":"Warning","@m":"chậm"}""",
                """{"@t":"2026-11-27T03:00:00Z","@l":"Error","@m":"lỗi CSDL","@x":"NpgsqlException"}""",
                "dòng hỏng",
                """{"@t":"2026-11-27T04:00:00Z","@l":"Debug","@m":"gỡ lỗi"}"""
            };
            await File.WriteAllLinesAsync(Path.Combine(dir.FullName, "culinary-20261127.json"), lines, Encoding.UTF8);
            await File.WriteAllTextAsync(Path.Combine(dir.FullName, "khac.json"), "{}");
            var reader = new SystemLogReader(new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { ["Logs:Directory"] = dir.FullName }).Build());

            var date = new DateOnly(2026, 11, 27);
            var warnings = await reader.ReadAsync(new LogQuery(date, "Warning", null, 10), CancellationToken.None);
            Assert.Equal(["lỗi CSDL", "chậm"], warnings.Items.Select(e => e.Message)); // mới nhất trước
            Assert.Equal(1, warnings.LevelCounts["Debug"]);

            var search = await reader.ReadAsync(new LogQuery(date, null, "npgsql", 10), CancellationToken.None);
            Assert.Single(search.Items); // tìm cả trong nội dung exception, không phân biệt hoa thường

            var latest = await reader.ReadAsync(new LogQuery(date, null, null, 2), CancellationToken.None);
            Assert.Equal(4, latest.TotalMatched);
            Assert.Equal(["gỡ lỗi", "lỗi CSDL"], latest.Items.Select(e => e.Message));

            Assert.Equal([date], reader.ListFiles().Select(f => f.Date)); // bỏ qua file không đúng tên
        }
        finally
        {
            dir.Delete(true);
        }
    }

    [Theory]
    [InlineData("2026-11-27", true)]
    [InlineData("27-11-2026", false)]
    public async Task Ngay_log_sai_dinh_dang(string date, bool valid)
    {
        var handler = new GetSystemLogsHandler(new EmptyLogReader(), TimeProvider.System);
        Task Run() => handler.Handle(new GetSystemLogsQuery(date, null, null, 10), CancellationToken.None);
        if (valid) await Run();
        else Assert.Equal(ErrorCodes.LogDateInvalid, (await Assert.ThrowsAsync<BadRequestException>(Run)).ErrorCode);
    }

    [Fact]
    public async Task Mac_dinh_doc_log_hom_nay_theo_gio_dia_phuong()
    {
        // 01:42 sáng 28/11 giờ Việt Nam = 18:42 ngày 27/11 giờ UTC; Serilog ghi vào culinary-20261128.json.
        var vietnam = TimeZoneInfo.CreateCustomTimeZone("ICT", TimeSpan.FromHours(7), "ICT", "ICT");
        var clock = new FixedClock(new DateTimeOffset(2026, 11, 27, 18, 42, 0, TimeSpan.Zero), vietnam);
        var page = await new GetSystemLogsHandler(new EmptyLogReader(), clock)
            .Handle(new GetSystemLogsQuery(null, null, null, 10), CancellationToken.None);

        Assert.Equal(new DateOnly(2026, 11, 28), page.Date);
    }

    // ---------------------------------------------------------------- email HTML
    [Fact]
    public void Template_email_ma_hoa_du_lieu_nguoi_dung()
    {
        var html = EmailTemplates.Render("welcome", "Chào mừng", "xin chào", new Dictionary<string, string>
        {
            ["DisplayName"] = "<script>alert(1)</script>",
            ["SiteUrl"] = "http://localhost:3000",
            ["DashboardUrl"] = "http://localhost:3000/dashboard"
        });

        Assert.Contains("&lt;script&gt;", html);
        Assert.DoesNotContain("<script>", html);
        Assert.Contains("http://localhost:3000/dashboard", html);
        Assert.DoesNotContain("{{", html); // không còn chỗ trống chưa thay
        Assert.StartsWith("<!DOCTYPE html>", html);
    }

    // ---------------------------------------------------------------- đồ giả để kiểm thử
    private static (SetUserActiveHandler Handler, FakeUsers Users, FakeTokens Tokens, AccessBlocklist Blocklist)
        LockHandler(string actorId, params (string Id, string Role)[] accounts)
    {
        var users = new FakeUsers(accounts);
        var tokens = new FakeTokens();
        var blocklist = new AccessBlocklist(TimeProvider.System);
        var handler = new SetUserActiveHandler(users, tokens, blocklist, new FakeUser(actorId, true),
            NullLogger<SetUserActiveHandler>.Instance);
        return (handler, users, tokens, blocklist);
    }

    private sealed record FakeUser(string? UserId, bool IsAdmin) : ICurrentUser;

    private sealed class FakeUsers((string Id, string Role)[] accounts) : IUserAdminService
    {
        private readonly Dictionary<string, UserListItemDto> _users = accounts.ToDictionary(a => a.Id, a =>
            new UserListItemDto(a.Id, $"{a.Id}@x.vn", a.Id, null, [a.Role], true, false, DateTime.UtcNow, 0, 0));

        public UserListItemDto Get(string id) => _users[id];

        public Task<(IReadOnlyList<UserListItemDto> Items, int TotalCount)> GetPageAsync(UserListFilter f, CancellationToken ct)
            => Task.FromResult<(IReadOnlyList<UserListItemDto>, int)>((_users.Values.ToList(), _users.Count));

        public Task<UserListItemDto?> GetAsync(string userId, CancellationToken ct)
            => Task.FromResult(_users.GetValueOrDefault(userId));

        public Task SetActiveAsync(string userId, bool active, CancellationToken ct)
        {
            _users[userId] = _users[userId] with { IsActive = active };
            return Task.CompletedTask;
        }
    }

    private sealed class FakeTokens : IRefreshTokenRepository
    {
        public List<string> RevokedUsers { get; } = [];
        public Task AddAsync(RefreshToken token, CancellationToken ct = default) => Task.CompletedTask;
        public Task<RefreshToken?> GetByHashAsync(string hash, CancellationToken ct = default) => Task.FromResult<RefreshToken?>(null);
        public Task<bool> TryRevokeAsync(Guid id, string? replacedByHash, CancellationToken ct = default) => Task.FromResult(true);

        public Task RevokeAllAsync(string userId, CancellationToken ct = default)
        {
            RevokedUsers.Add(userId);
            return Task.CompletedTask;
        }
    }

    private sealed class EmptyLogReader : ISystemLogReader
    {
        public IReadOnlyList<LogFileDto> ListFiles() => [];

        public Task<LogPageDto> ReadAsync(LogQuery query, CancellationToken ct)
            => Task.FromResult(new LogPageDto(query.Date, [], 0, new Dictionary<string, int>()));
    }

    private sealed class ManualClock : TimeProvider
    {
        private DateTimeOffset _now = DateTimeOffset.UtcNow;
        public void Advance(TimeSpan by) => _now += by;
        public override DateTimeOffset GetUtcNow() => _now;
    }

    private sealed class FixedClock(DateTimeOffset now, TimeZoneInfo zone) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
        public override TimeZoneInfo LocalTimeZone => zone;
    }
}
