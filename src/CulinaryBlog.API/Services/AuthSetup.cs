using System.Text;
using CulinaryBlog.Application.Users;
using CulinaryBlog.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace CulinaryBlog.API.Services;

public static class AuthSetup
{
    public const string AdminPolicy = "AdminPolicy";
    public const string AuthorPolicy = "AuthorPolicy";

    public static IServiceCollection AddJwtAuth(this IServiceCollection services, IConfiguration configuration)
    {
        var jwt = configuration.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new();
        if (Encoding.UTF8.GetByteCount(jwt.Key) < 32)
            throw new InvalidOperationException("Cấu hình 'Jwt:Key' phải dài ít nhất 32 byte.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = jwt.Issuer,
                    ValidAudience = jwt.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = "sub",
                    RoleClaimType = "role"
                };
                // Tài khoản bị quản trị viên khóa thì token cũ (còn hạn tới 15 phút) bị từ chối ngay.
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = context =>
                    {
                        var userId = context.Principal?.FindFirst("sub")?.Value;
                        var blocklist = context.HttpContext.RequestServices.GetRequiredService<IAccessBlocklist>();
                        if (userId is not null && blocklist.IsBlocked(userId))
                            context.Fail("Tài khoản đã bị khóa.");
                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(AdminPolicy, p => p.RequireRole("Admin"))
            .AddPolicy(AuthorPolicy, p => p.RequireRole("Author", "Admin"));

        return services;
    }
}
