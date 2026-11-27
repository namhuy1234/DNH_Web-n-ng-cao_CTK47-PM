using CulinaryBlog.Application.Auth;
using MediatR;

namespace CulinaryBlog.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth").WithTags("Auth");

        group.MapPost("/register", async (RegisterCommand command, ISender sender, CancellationToken ct) =>
            Results.Created("/api/v1/auth/me", await sender.Send(command, ct)));

        group.MapPost("/login", async (LoginCommand command, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(command, ct)));

        group.MapPost("/google", async (GoogleLoginCommand command, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(command, ct)));

        group.MapPost("/refresh", async (RefreshTokenCommand command, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(command, ct)));

        group.MapPost("/logout", async (LogoutCommand command, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(command, ct);
            return Results.NoContent();
        }).RequireAuthorization();

        group.MapGet("/me", async (ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetMyProfileQuery(), ct))).RequireAuthorization();

        group.MapPatch("/me", async (UpdateProfileCommand command, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(command, ct))).RequireAuthorization();
    }
}
