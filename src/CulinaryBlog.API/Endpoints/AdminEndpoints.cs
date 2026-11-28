using CulinaryBlog.API.Services;
using CulinaryBlog.Application.Admin;
using CulinaryBlog.Application.Users;
using MediatR;

namespace CulinaryBlog.API.Endpoints;

/// <summary>Các chức năng chỉ dành cho quản trị viên: người dùng và nhật ký hệ thống.</summary>
public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        // ----- Người dùng -----
        var users = app.MapGroup("/users").WithTags("Users").RequireAuthorization(AuthSetup.AdminPolicy);

        users.MapGet("/", async (
            ISender sender, CancellationToken ct,
            int page = 1, int pageSize = 20, string? role = null, string? q = null, string? status = null) =>
            Results.Ok(await sender.Send(new GetUsersQuery(page, pageSize, role, q, status), ct)));

        users.MapPatch("/{id}/lock", async (string id, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new SetUserActiveCommand(id, false), ct)));

        users.MapPatch("/{id}/unlock", async (string id, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new SetUserActiveCommand(id, true), ct)));

        // ----- Nhật ký hệ thống -----
        var logs = app.MapGroup("/admin/logs").WithTags("Logs").RequireAuthorization(AuthSetup.AdminPolicy);

        logs.MapGet("/", async (
            ISender sender, CancellationToken ct,
            string? date = null, string? level = null, string? q = null, int take = 200) =>
            Results.Ok(await sender.Send(new GetSystemLogsQuery(date, level, q, take), ct)));

        logs.MapGet("/files", async (ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetLogFilesQuery(), ct)));
    }
}
