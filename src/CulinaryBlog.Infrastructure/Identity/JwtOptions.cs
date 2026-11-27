namespace CulinaryBlog.Infrastructure.Identity;

public class JwtOptions
{
    public const string Section = "Jwt";

    public string Issuer { get; set; } = "culinary-blog";
    public string Audience { get; set; } = "culinary-blog-client";
    public string Key { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 7;
}
