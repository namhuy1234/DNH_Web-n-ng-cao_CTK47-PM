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
