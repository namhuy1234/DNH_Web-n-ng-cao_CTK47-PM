using CulinaryBlog.Application.Auth;
using CulinaryBlog.Application.Common;
using CulinaryBlog.Infrastructure.Email;
using CulinaryBlog.Infrastructure.Storage;
using CulinaryBlog.Domain.Repositories;
using CulinaryBlog.Infrastructure.Persistence.Repositories;
using CulinaryBlog.Infrastructure.Identity;
using CulinaryBlog.Infrastructure.Persistence;
using CulinaryBlog.Infrastructure.Persistence.Interceptors;
using CulinaryBlog.Infrastructure.Persistence.Seed;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using CulinaryBlog.Application.Admin;
using CulinaryBlog.Application.Users;
using CulinaryBlog.Infrastructure.Logging;

namespace CulinaryBlog.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Thiếu chuỗi kết nối 'ConnectionStrings:Default'.");

        services.AddSingleton<AuditInterceptor>();
        services.AddDbContext<CulinaryBlogDbContext>((provider, options) => options
            .UseNpgsql(connectionString)
            .AddInterceptors(provider.GetRequiredService<AuditInterceptor>()));

        services.AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 8;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<CulinaryBlogDbContext>()
            .AddDefaultTokenProviders();

        // Token đặt lại mật khẩu: hết hạn sau 30 phút; gắn với SecurityStamp nên dùng xong là hết hiệu lực.
        services.AddDataProtection();
        services.Configure<DataProtectionTokenProviderOptions>(o => o.TokenLifespan = TimeSpan.FromMinutes(30));
        services.Configure<EmailOptions>(configuration.GetSection("Email"));
        // Email gửi qua hàng đợi chạy nền: yêu cầu HTTP không phải chờ SMTP.
        services.AddSingleton<EmailQueue>();
        services.AddHostedService<EmailSenderService>();
        services.AddScoped<IAuthEmailService, AuthEmailService>();

        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IRecipeRepository, RecipeRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IUserReader, UserReader>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IGoogleTokenVerifier, GoogleTokenVerifier>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<DbSeeder>();

        // Lab 8: quản lý người dùng và đọc nhật ký hệ thống.
        services.TryAddSingleton(TimeProvider.System);
        services.AddScoped<IUserAdminService, UserAdminService>();
        services.AddSingleton<IAccessBlocklist, AccessBlocklist>();
        services.AddSingleton<ISystemLogReader, SystemLogReader>();

        return services;
    }
}
