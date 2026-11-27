using CulinaryBlog.Application.Auth;

namespace CulinaryBlog.UnitTests;

/// <summary>Quy tắc cho đổi mật khẩu, quên mật khẩu, đặt lại mật khẩu (Lab 7).</summary>
public class PasswordTests
{
    [Theory]
    [InlineData("Cu@12345", "Moi@12345", true)]
    [InlineData("Cu@12345", "Cu@12345", false)]   // mật khẩu mới trùng mật khẩu cũ
    [InlineData("", "Moi@12345", false)]          // thiếu mật khẩu hiện tại
    [InlineData("Cu@12345", "moi12345", false)]   // mật khẩu mới yếu
    public void Doi_mat_khau(string current, string next, bool valid)
        => Assert.Equal(valid, new ChangePasswordValidator().Validate(new ChangePasswordCommand(current, next)).IsValid);

    [Theory]
    [InlineData("a@b.vn", true)]
    [InlineData("khong-phai-email", false)]
    [InlineData("", false)]
    public void Quen_mat_khau_can_email_hop_le(string email, bool valid)
        => Assert.Equal(valid, new ForgotPasswordValidator().Validate(new ForgotPasswordCommand(email)).IsValid);

    [Theory]
    [InlineData("a@b.vn", "token", "Moi@12345", true)]
    [InlineData("a@b.vn", "", "Moi@12345", false)]    // thiếu token
    [InlineData("a@b.vn", "token", "Ab@1", false)]    // mật khẩu quá ngắn
    public void Dat_lai_mat_khau(string email, string token, string password, bool valid)
        => Assert.Equal(valid,
            new ResetPasswordValidator().Validate(new ResetPasswordCommand(email, token, password)).IsValid);
}
