using CulinaryBlog.API.Services;
using CulinaryBlog.Application.Auth;
using MediatR;

namespace CulinaryBlog.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth").WithTags("Auth").RequireRateLimiting(RateLimitSetup.AuthPolicy);

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

        group.MapPost("/change-password", async (ChangePasswordCommand command, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(command, ct))).RequireAuthorization();

        // Luôn trả 202 dù email có tồn tại hay không, để không lộ ai đã đăng ký.
        group.MapPost("/forgot-password", async (ForgotPasswordCommand command, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(command, ct);
            return Results.Accepted(value: new { message = "Nếu email đã đăng ký, hướng dẫn đặt lại mật khẩu đã được gửi." });
        });

        group.MapPost("/reset-password", async (ResetPasswordCommand command, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(command, ct);
            return Results.NoContent();
        });

        group.MapGet("/me", async (ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetMyProfileQuery(), ct))).RequireAuthorization();

        group.MapPatch("/me", async (UpdateProfileCommand command, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(command, ct))).RequireAuthorization();
    }
}
