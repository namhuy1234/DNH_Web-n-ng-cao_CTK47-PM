using CulinaryBlog.Domain.Common;

namespace CulinaryBlog.Domain.Entities;

public class Category : BaseEntity
{
    private Category() { }

    public string Name { get; private set; } = null!;
    public string Slug { get; private set; } = null!;
    public string? Description { get; private set; }
    public string? ImageUrl { get; private set; }
    public int OrderIndex { get; private set; }

    // Đổi tên không đổi slug để không làm hỏng liên kết cũ.
    public void Update(string name, string? description, string? imageUrl, int orderIndex)
    {
        Name = name.Trim();
        Description = description;
        ImageUrl = imageUrl;
        OrderIndex = orderIndex;
    }

    public ICollection<Recipe> Recipes { get; private set; } = new List<Recipe>();

    public static Category Create(string name, string? description = null, int orderIndex = 0, string? imageUrl = null, string? slug = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        return new Category
        {
            Name = name.Trim(),
            Slug = slug ?? SlugHelper.Generate(name),
            Description = description,
            OrderIndex = orderIndex,
            ImageUrl = imageUrl
        };
    }
}
