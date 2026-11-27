namespace CulinaryBlog.Infrastructure.Persistence.Seed;

/// <summary>Danh sách từ tiếng Việt để Bogus chọn ngẫu nhiên.</summary>
internal static class SeedData
{
    /// <summary>24 danh mục, mỗi danh mục 5 món.</summary>
    public static readonly (string Name, string[] Dishes)[] Categories =
    [
        ("Món khai vị", ["Gỏi cuốn tôm thịt", "Chả giò hải sản", "Nộm ngó sen", "Súp cua", "Salad bơ trứng"]),
        ("Món chính", ["Cá kho tộ", "Thịt kho trứng", "Sườn xào chua ngọt", "Gà rang gừng", "Bò lúc lắc"]),
        ("Món canh", ["Canh chua cá lóc", "Canh bí đỏ thịt bằm", "Canh khổ qua nhồi thịt", "Canh rau ngót tôm khô", "Canh sườn hầm củ quả"]),
        ("Món lẩu", ["Lẩu Thái hải sản", "Lẩu gà lá é", "Lẩu mắm miền Tây", "Lẩu bò nhúng giấm", "Lẩu nấm chay"]),
        ("Phở và bún", ["Phở bò tái lăn", "Phở gà ta", "Bún chả Hà Nội", "Bún bò Huế", "Bún riêu cua"]),
        ("Mì và miến", ["Mì Quảng tôm thịt", "Miến gà măng khô", "Mì xào bò", "Hủ tiếu Nam Vang", "Miến xào cua"]),
        ("Cơm", ["Cơm tấm sườn bì", "Cơm chiên Dương Châu", "Cơm gà Hội An", "Cơm rang dưa bò", "Cơm niêu cá kho"]),
        ("Cháo", ["Cháo sườn", "Cháo gà đậu xanh", "Cháo hải sản", "Cháo cá lóc rau đắng", "Cháo lòng"]),
        ("Món chay", ["Đậu hũ sốt cà", "Nấm kho tiêu", "Rau củ xào chay", "Cà tím om đậu", "Canh chua chay"]),
        ("Món nướng", ["Sườn nướng mật ong", "Gà nướng muối ớt", "Cá nướng giấy bạc", "Bò nướng lá lốt", "Tôm nướng sa tế"]),
        ("Món chiên", ["Gà chiên nước mắm", "Cá chiên xù", "Đậu hũ chiên giòn", "Tôm lăn bột chiên", "Chả cá chiên thì là"]),
        ("Món hấp", ["Cá chẽm hấp xì dầu", "Gà hấp lá chanh", "Nghêu hấp sả", "Chả trứng hấp", "Mực hấp gừng"]),
        ("Hải sản", ["Tôm rim mặn ngọt", "Mực xào cần tỏi", "Cua rang me", "Ốc xào dừa", "Sò điệp nướng mỡ hành"]),
        ("Món gỏi", ["Gỏi gà xé phay", "Gỏi xoài tôm khô", "Gỏi bò bóp thấu", "Gỏi đu đủ khô bò", "Gỏi bưởi hải sản"]),
        ("Bánh mặn", ["Bánh xèo miền Tây", "Bánh cuốn nóng", "Bánh khọt Vũng Tàu", "Bánh bột lọc Huế", "Bánh mì kẹp thịt nướng"]),
        ("Bánh ngọt", ["Bánh bông lan trứng muối", "Bánh flan caramel", "Bánh chuối nướng", "Bánh su kem", "Bánh tiramisu"]),
        ("Chè và tráng miệng", ["Chè hạt sen long nhãn", "Chè ba màu", "Chè bưởi", "Sương sáo hạt lựu", "Rau câu dừa"]),
        ("Đồ uống", ["Trà đào cam sả", "Sinh tố bơ", "Nước ép dưa hấu bạc hà", "Sữa đậu nành lá dứa", "Cà phê muối"]),
        ("Ăn sáng", ["Xôi gà lá dứa", "Trứng ốp la pate", "Bánh giò", "Xôi xéo", "Yến mạch sữa chua trái cây"]),
        ("Ăn vặt", ["Bánh tráng trộn", "Khoai tây lắc phô mai", "Nem chua rán", "Bắp xào bơ", "Cá viên chiên"]),
        ("Món Âu", ["Mì Ý sốt bò bằm", "Bít tết sốt tiêu đen", "Súp kem nấm", "Gà đút lò thảo mộc", "Pizza hải sản"]),
        ("Món Hàn", ["Cơm trộn Bibimbap", "Canh kim chi", "Bánh gạo cay", "Gà sốt cay Hàn Quốc", "Miến trộn Japchae"]),
        ("Món Nhật", ["Cơm cuộn sushi", "Mì ramen xá xíu", "Cơm cà ri Nhật", "Tempura tôm rau củ", "Súp miso rong biển"]),
        ("Ăn kiêng", ["Ức gà áp chảo rau củ", "Salad cá ngừ", "Cơm gạo lứt cá hồi", "Canh rong biển đậu hũ", "Bông cải xanh xào tỏi"]),
    ];

    public static readonly string[] Styles =
        ["chuẩn vị", "kiểu nhà làm", "đậm đà", "thơm ngon", "đơn giản", "đặc biệt", "cho ngày cuối tuần"];

    public static readonly string[] MainIngredients =
        ["Thịt ba chỉ", "Thịt bò thăn", "Ức gà", "Đùi gà", "Sườn non", "Tôm tươi", "Mực ống", "Cá lóc", "Đậu hũ non", "Nấm đùi gà"];

    /// <summary>Tên, đơn vị, số lượng nhỏ nhất và lớn nhất.</summary>
    public static readonly (string Name, string Unit, int Min, int Max)[] Ingredients =
    [
        ("Hành tím", "củ", 2, 6), ("Tỏi", "tép", 2, 8), ("Gừng", "gram", 10, 50), ("Sả", "cây", 1, 5),
        ("Ớt sừng", "quả", 1, 4), ("Hành lá", "nhánh", 2, 6), ("Ngò rí", "gram", 10, 40), ("Rau răm", "gram", 10, 40),
        ("Húng quế", "gram", 10, 40), ("Cà chua", "quả", 1, 4), ("Cà rốt", "củ", 1, 3), ("Hành tây", "củ", 1, 2),
        ("Khoai tây", "củ", 1, 4), ("Dưa leo", "quả", 1, 3), ("Giá đỗ", "gram", 50, 200), ("Rau xà lách", "gram", 50, 200),
        ("Nước mắm", "muỗng canh", 1, 4), ("Nước tương", "muỗng canh", 1, 3), ("Dầu hào", "muỗng canh", 1, 2),
        ("Đường", "muỗng cà phê", 1, 5), ("Muối", "muỗng cà phê", 1, 3), ("Hạt nêm", "muỗng cà phê", 1, 3),
        ("Tiêu xay", "muỗng cà phê", 1, 2), ("Ớt bột", "muỗng cà phê", 1, 2), ("Dầu ăn", "ml", 15, 100),
        ("Dầu mè", "muỗng cà phê", 1, 2), ("Giấm gạo", "muỗng canh", 1, 3), ("Nước cốt chanh", "muỗng canh", 1, 3),
        ("Mật ong", "muỗng canh", 1, 3), ("Nước cốt dừa", "ml", 50, 300), ("Nước dùng", "ml", 200, 1500),
        ("Bột năng", "gram", 10, 60), ("Bột mì", "gram", 50, 300), ("Trứng gà", "quả", 1, 6),
        ("Sữa tươi", "ml", 50, 300), ("Bơ lạt", "gram", 10, 80), ("Mè rang", "gram", 5, 30),
        ("Đậu phộng rang", "gram", 20, 80), ("Sa tế", "muỗng cà phê", 1, 3), ("Me chín", "gram", 20, 60),
    ];

    public static readonly string[] Notes = ["rửa sạch", "băm nhỏ", "thái lát mỏng", "cắt khúc", "để ráo", "vừa ăn"];

    /// <summary>Các bước theo đúng thứ tự nấu. Optional: bước có thể bỏ qua. Timed: bước có hẹn giờ.</summary>
    public static readonly (string Title, string Description, bool Optional, bool Timed)[] Steps =
    [
        ("Chuẩn bị nguyên liệu", "Cân đong đủ nguyên liệu cho món {0}, rửa sạch và để ráo.", false, false),
        ("Sơ chế", "Sơ chế {1}, khử mùi bằng muối và gừng rồi cắt miếng vừa ăn.", false, true),
        ("Ướp gia vị", "Ướp {1} với gia vị và hành tỏi băm cho thấm.", false, true),
        ("Pha nước sốt", "Hòa các gia vị còn lại thành nước sốt, nêm thử cho vừa miệng.", true, false),
        ("Phi thơm", "Làm nóng chảo với dầu ăn, phi hành tỏi đến khi vàng thơm.", false, true),
        ("Chế biến chính", "Cho {1} vào nấu ở lửa vừa, đảo đều tay đến khi săn lại.", false, true),
        ("Nấu cho thấm", "Hạ lửa nhỏ, thêm nước sốt và nấu đến khi {1} chín mềm, thấm vị.", true, true),
        ("Nêm nếm lại", "Nêm lại gia vị theo khẩu vị rồi tắt bếp.", true, false),
        ("Trình bày", "Cho món {0} ra đĩa, trang trí rau thơm và thưởng thức.", false, false),
    ];
}
