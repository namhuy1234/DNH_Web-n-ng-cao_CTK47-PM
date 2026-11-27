using CulinaryBlog.Domain.Common;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using CulinaryBlog.Domain.Exceptions;

namespace CulinaryBlog.UnitTests;

public class RecipeTests
{
    private static Recipe NewRecipe(int steps = 0, int ingredients = 0)
    {
        var recipe = Recipe.Create("Phở bò", "Mô tả", "", Guid.NewGuid(), "user-1", 10, 20, 2, RecipeDifficulty.Easy);
        for (var i = 1; i <= steps; i++) recipe.AddStep($"B{i}", "Làm");
        for (var i = 1; i <= ingredients; i++) recipe.AddIngredient($"N{i}", 1, "gram");
        return recipe;
    }

    [Theory]
    [InlineData("Phở Bò Tái Lăn", "pho-bo-tai-lan")]
    [InlineData("  Đậu hũ -- sốt cà!  ", "dau-hu-sot-ca")]
    [InlineData("!!!", "")]
    public void Slug_bo_dau_va_ky_tu_dac_biet(string text, string slug)
        => Assert.Equal(slug, SlugHelper.Generate(text));

    [Theory]
    [InlineData(0, 1)]
    [InlineData(1, 0)]
    public void Khong_xuat_ban_khi_thieu_buoc_hoac_nguyen_lieu(int steps, int ingredients)
        => Assert.Throws<BusinessRuleException>(() => NewRecipe(steps, ingredients).Publish(DateTime.UtcNow));

    [Fact]
    public void Xuat_ban_lai_giu_nguyen_ngay_cu()
    {
        var recipe = NewRecipe(1, 1);
        var first = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        recipe.Publish(first);
        recipe.Publish(first.AddDays(5));

        Assert.Equal(first, recipe.PublishedAt);
    }

    [Fact]
    public void Xoa_buoc_thi_danh_so_lai_va_buoc_moi_khong_trung_so()
    {
        var recipe = NewRecipe(steps: 3);

        recipe.RemoveStep(recipe.Steps.Single(s => s.StepNumber == 2));
        recipe.AddStep("Moi", "Làm");

        Assert.Equal([1, 2, 3], recipe.Steps.Select(s => s.StepNumber).Order());
    }

    [Fact]
    public void Bai_cong_khai_phai_con_nguyen_lieu_va_buoc()
    {
        var recipe = NewRecipe(1, 1);
        recipe.Publish(DateTime.UtcNow);

        Assert.Throws<BusinessRuleException>(() => recipe.RemoveIngredient(recipe.Ingredients.Single()));
        Assert.Throws<BusinessRuleException>(() => recipe.RemoveStep(recipe.Steps.Single()));
    }

    [Fact]
    public void Anh_dau_tien_la_anh_chinh()
    {
        var recipe = NewRecipe();

        recipe.AddImage("/a.png");
        recipe.AddImage("/b.png");

        Assert.Equal([true, false], recipe.Images.Select(i => i.IsPrimary));
    }
}
