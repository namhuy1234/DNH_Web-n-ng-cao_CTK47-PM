using Bogus;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Infrastructure.Persistence.Seed;

/// <summary>Tạo dữ liệu ngẫu nhiên: role, người dùng, danh mục và công thức.</summary>
public class DbSeeder(
    CulinaryBlogDbContext db,
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole> roleManager,
    IConfiguration configuration,
    ILogger<DbSeeder> logger)
{
    private const int MinIngredients = 10, MaxIngredients = 15;
    private const int MinSteps = 6, MaxSteps = 9;
    private const int AuthorCount = 5;

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        // Đã có dữ liệu thì bỏ qua, chạy lại nhiều lần không bị nhân đôi.
        if (await db.Categories.IgnoreQueryFilters().AnyAsync(cancellationToken))
        {
            logger.LogInformation("Database đã có dữ liệu, bỏ qua bước seed.");
            return;
        }

        // Seed cố định để mỗi lần tạo lại database cho cùng một kết quả.
        Randomizer.Seed = new Random(2312632);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var authorIds = await SeedUsersAsync();
        var categories = SeedData.Categories
            .Select((c, index) => Category.Create(c.Name, $"Tổng hợp công thức {c.Name.ToLower()} dễ làm tại nhà.", index + 1))
            .ToList();
        db.Categories.AddRange(categories);

        var recipes = CreateRecipes(categories, authorIds);
        db.Recipes.AddRange(recipes);

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        logger.LogInformation("Đã seed {Categories} danh mục, {Recipes} công thức, {Ingredients} nguyên liệu, {Steps} bước.",
            categories.Count, recipes.Count, recipes.Sum(r => r.Ingredients.Count), recipes.Sum(r => r.Steps.Count));
    }

    private async Task<List<string>> SeedUsersAsync()
    {
        var password = configuration["Seed:Password"]
            ?? throw new InvalidOperationException("Thiếu cấu hình 'Seed:Password'.");

        foreach (var role in new[] { "Admin", "Author" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                Ensure(await roleManager.CreateAsync(new IdentityRole(role)));
        }

        await CreateUserAsync("admin@culinaryblog.local", "Quản trị viên", "Admin", password);

        var faker = new Faker("vi");
        var authorIds = new List<string>();
        for (var i = 1; i <= AuthorCount; i++)
        {
            authorIds.Add(await CreateUserAsync(
                $"author{i}@culinaryblog.local", faker.Name.FullName(), "Author", password));
        }

        return authorIds;
    }

    private async Task<string> CreateUserAsync(string email, string displayName, string role, string password)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is not null) return user.Id;

        user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            DisplayName = displayName,
            CreatedAt = DateTime.UtcNow
        };
        Ensure(await userManager.CreateAsync(user, password));
        Ensure(await userManager.AddToRoleAsync(user, role));

        return user.Id;
    }

    private static void Ensure(IdentityResult result)
    {
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
    }

    private static List<Recipe> CreateRecipes(List<Category> categories, List<string> authorIds)
    {
        var faker = new Faker("vi");
        var recipes = new List<Recipe>();

        for (var c = 0; c < categories.Count; c++)
        {
            foreach (var dish in SeedData.Categories[c].Dishes)
            {
                recipes.Add(CreateRecipe(faker, dish, categories[c], faker.PickRandom(authorIds)));
            }
        }

        return recipes;
    }

    private static Recipe CreateRecipe(Faker faker, string dish, Category category, string authorId)
    {
        var title = $"{dish} {faker.PickRandom(SeedData.Styles)}";
        var createdAt = faker.Date.Past(1).ToUniversalTime();

        var recipe = Recipe.Create(
            title,
            description: $"{title} là món thuộc nhóm {category.Name.ToLower()}, nguyên liệu dễ tìm, " +
                         "cách làm rõ ràng, phù hợp cho bữa ăn gia đình.",
            instructions: $"Làm lần lượt theo các bước bên dưới để hoàn thành món {dish}.",
            category.Id,
            authorId,
            prepTime: faker.Random.Int(2, 12) * 5,
            cookTime: faker.Random.Int(0, 18) * 5,
            servings: faker.Random.Int(1, 8),
            difficulty: faker.PickRandom<RecipeDifficulty>());
        recipe.CreatedAt = createdAt;

        // Dữ liệu ngẫu nhiên nên nguyên liệu không nhất thiết khớp với tên món.
        var mainIngredient = faker.PickRandom(SeedData.MainIngredients);
        recipe.AddIngredient(mainIngredient, faker.Random.Int(2, 10) * 100, "gram", "nguyên liệu chính");

        var total = faker.Random.Int(MinIngredients, MaxIngredients);
        foreach (var item in faker.PickRandom(SeedData.Ingredients, total - 1))
        {
            recipe.AddIngredient(item.Name, faker.Random.Int(item.Min, item.Max), item.Unit,
                faker.PickRandom(SeedData.Notes).OrNull(faker, 0.7f));
        }

        // Chọn ngẫu nhiên các bước tùy chọn nhưng vẫn giữ đúng thứ tự nấu.
        var stepCount = faker.Random.Int(MinSteps, MaxSteps);
        var required = SeedData.Steps.Count(s => !s.Optional);
        var optional = faker.PickRandom(
                Enumerable.Range(0, SeedData.Steps.Length).Where(i => SeedData.Steps[i].Optional),
                Math.Max(0, stepCount - required))
            .ToHashSet();

        for (var i = 0; i < SeedData.Steps.Length; i++)
        {
            var step = SeedData.Steps[i];
            if (step.Optional && !optional.Contains(i)) continue;

            recipe.AddStep(
                step.Title,
                string.Format(step.Description, dish, mainIngredient.ToLower()),
                step.Timed ? faker.Random.Int(1, 9) * 5 : null);
        }

        recipe.SetNutrition(new RecipeNutrition
        {
            Calories = faker.Random.Int(120, 850),
            Protein = faker.Random.Int(3, 55),
            Carbohydrates = faker.Random.Int(5, 90),
            Fat = faker.Random.Int(2, 40),
            Fiber = faker.Random.Int(1, 12),
            Sodium = faker.Random.Int(80, 1500)
        });

        // Phần lớn công khai, một ít nháp hoặc lưu trữ để thử phân quyền sau này.
        var roll = faker.Random.Int(1, 100);
        if (roll <= 80) recipe.Publish(createdAt.AddHours(faker.Random.Int(1, 12)));
        else if (roll > 92) recipe.Archive();

        return recipe;
    }
}
