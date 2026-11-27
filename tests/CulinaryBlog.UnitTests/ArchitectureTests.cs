using CulinaryBlog.Application;
using CulinaryBlog.Domain.Entities;

namespace CulinaryBlog.UnitTests;

/// <summary>Kiểm tra Dependency Rule của Clean Architecture (NFR-MAINT-004).</summary>
public class ArchitectureTests
{
    private static string[] ReferencesOf(Type type)
        => type.Assembly.GetReferencedAssemblies().Select(a => a.Name!).ToArray();

    [Fact]
    public void Domain_khong_phu_thuoc_tang_khac_va_thu_vien_ngoai()
    {
        var external = ReferencesOf(typeof(Recipe))
            .Where(name => !name.StartsWith("System") && name != "netstandard");

        Assert.Empty(external);
    }

    [Fact]
    public void Application_khong_phu_thuoc_ha_tang()
    {
        var references = ReferencesOf(typeof(DependencyInjection));

        Assert.DoesNotContain(references, name =>
            name is "CulinaryBlog.Infrastructure" or "CulinaryBlog.API"
            || name.StartsWith("Microsoft.EntityFrameworkCore")
            || name.StartsWith("Npgsql")
            || name.StartsWith("Microsoft.AspNetCore"));
    }
}
