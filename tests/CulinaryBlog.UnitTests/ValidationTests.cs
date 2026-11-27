using CulinaryBlog.Application.Auth;
using CulinaryBlog.Application.Categories;
using CulinaryBlog.Application.Recipes;
using CulinaryBlog.Domain.Exceptions;

namespace CulinaryBlog.UnitTests;

public class ValidationTests
{
    [Theory]
    [InlineData("z ", false)]
    [InlineData("<b>", false)]
    [InlineData("!!", false)]
    [InlineData(" ab ", true)]
    public void Ten_danh_muc(string name, bool valid)
        => Assert.Equal(valid, new CreateCategoryValidator().Validate(new CreateCategoryCommand(name, null)).IsValid);

    [Theory]
    [InlineData("Abcdef@1", true)]
    [InlineData("abcdef@1", false)]
    [InlineData("Abcdefg1", false)]
    [InlineData("Ab@1", false)]
    public void Do_manh_mat_khau(string password, bool valid)
        => Assert.Equal(valid,
            new RegisterValidator().Validate(new RegisterCommand("a@b.vn", password, "Tên")).IsValid);

    [Fact]
    public void So_thu_tu_buoc_khong_duoc_trung()
    {
        var command = new CreateRecipeCommand("Món thử", "Mô tả", Guid.NewGuid(), 1, 1, 1,
            Domain.Enums.RecipeDifficulty.Easy, null, null, null,
            [new StepInput("A", "d", null, null, 1), new StepInput("B", "d", null, null, 1)]);

        Assert.False(new CreateRecipeValidator().Validate(command).IsValid);
    }

    [Fact]
    public async Task Anh_dung_chu_ky_duoc_chap_nhan()
    {
        byte[] png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0];

        var extension = await ImageFile.ValidateAsync(new MemoryStream(png), png.Length, "image/png", default);

        Assert.Equal(".png", extension);
    }

    [Theory]
    [InlineData("image/png", 100)]
    [InlineData("text/html", 100)]
    [InlineData("image/png", 6 * 1024 * 1024)]
    public async Task File_gia_mao_sai_loai_hoac_qua_lon_bi_tu_choi(string contentType, long length)
        => await Assert.ThrowsAsync<BadRequestException>(() =>
            ImageFile.ValidateAsync(new MemoryStream("khong phai anh"u8.ToArray()), length, contentType, default));
}
