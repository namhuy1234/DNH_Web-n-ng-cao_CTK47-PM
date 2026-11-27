namespace CulinaryBlog.API.Services;

public static class CorsSetup
{
    public const string Policy = "Frontend";

    /// <summary>Chỉ cho phép các origin khai báo trong cấu hình, không dùng wildcard.</summary>
    public static IServiceCollection AddFrontendCors(this IServiceCollection services, IConfiguration configuration)
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        if (origins.Contains("*"))
            throw new InvalidOperationException("Cors:AllowedOrigins không được dùng '*'.");

        return services.AddCors(options => options.AddPolicy(Policy, policy => policy
            .WithOrigins(origins)
            .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
            .WithHeaders("Content-Type", "Authorization", "If-Match", "X-Correlation-ID")
            .WithExposedHeaders("Location", "Retry-After", "api-supported-versions")));
    }
}
