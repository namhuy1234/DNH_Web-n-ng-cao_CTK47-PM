using CulinaryBlog.Application.Auth;
using CulinaryBlog.Application.Behaviors;
using CulinaryBlog.Application.Recipes;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace CulinaryBlog.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        services.AddMediatR(config =>
        {
            config.RegisterServicesFromAssembly(assembly);
            // Ghi log trước để đo cả thời gian kiểm tra dữ liệu và ghi nhận request bị từ chối.
            config.AddOpenBehavior(typeof(LoggingBehavior<,>));
            config.AddOpenBehavior(typeof(ValidationBehavior<,>));
        });
        services.AddValidatorsFromAssembly(assembly);
        services.AddScoped<SessionIssuer>();
        services.AddScoped<RecipeSummaryMapper>();
        services.AddScoped<RecipeDetailReader>();
        services.AddScoped<RecipeAccess>();

        return services;
    }
}
