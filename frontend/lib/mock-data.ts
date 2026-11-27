import type { PagedResult, RecipeDifficulty, RecipeStatus, RecipeSummaryDto } from "@/types";

/**
 * Dữ liệu mẫu cho giao diện tĩnh (Lab 6). Cấu trúc trùng RecipeSummaryDto nên
 * Lab 7 chỉ cần thay các hàm bên dưới bằng lời gọi API thật.
 */
const SAMPLES: Array<[string, string, string, number, number, RecipeDifficulty, string]> = [
  ["Phở bò Hà Nội", "pho-bo-ha-noi", "Nước dùng trong, ngọt xương, thơm quế hồi và gừng nướng.", 30, 180, "Medium", "Món chính"],
  ["Bún chả", "bun-cha", "Chả nướng than hoa ăn kèm bún, rau sống và nước chấm chua ngọt.", 40, 30, "Medium", "Món chính"],
  ["Gỏi cuốn tôm thịt", "goi-cuon-tom-thit", "Cuốn bánh tráng tươi mát với tôm, thịt luộc và rau thơm.", 25, 15, "Easy", "Khai vị"],
  ["Cá kho tộ", "ca-kho-to", "Cá basa kho nước màu, tiêu xanh, đậm đà đưa cơm.", 15, 45, "Easy", "Món chính"],
  ["Canh chua cá lóc", "canh-chua-ca-loc", "Vị chua thanh của me, thơm rau om và ngò gai.", 20, 25, "Easy", "Canh"],
  ["Bánh xèo miền Tây", "banh-xeo-mien-tay", "Vỏ giòn vàng nghệ, nhân tôm thịt giá đỗ.", 30, 40, "Hard", "Ăn vặt"],
  ["Chè ba màu", "che-ba-mau", "Đậu xanh, đậu đỏ, thạch lá dứa và nước cốt dừa.", 30, 60, "Easy", "Tráng miệng"],
  ["Bò lúc lắc", "bo-luc-lac", "Thịt bò xào lửa lớn, mềm ngọt, ăn với khoai tây chiên.", 20, 15, "Medium", "Món chính"],
  ["Bánh mì thịt nướng", "banh-mi-thit-nuong", "Thịt nướng sả, đồ chua và pa tê trong ổ bánh mì giòn.", 30, 20, "Easy", "Ăn sáng"],
  ["Lẩu thái hải sản", "lau-thai-hai-san", "Nước lẩu chua cay, hải sản tươi cho bữa tối đông người.", 40, 30, "Medium", "Lẩu"],
  ["Xôi gà", "xoi-ga", "Xôi dẻo thơm mỡ gà, gà xé phay và hành phi.", 20, 50, "Medium", "Ăn sáng"],
  ["Bánh flan caramel", "banh-flan-caramel", "Mềm mịn, béo trứng sữa, lớp caramel đắng nhẹ.", 20, 40, "Expert", "Tráng miệng"],
];

const AUTHORS = ["Đặng Nam Huy", "Nguyễn Thu Hà", "Trần Minh Khoa"];

export const MOCK_RECIPES: RecipeSummaryDto[] = SAMPLES.map(
  ([title, slug, description, prepTime, cookTime, difficulty, categoryName], i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    title,
    slug,
    description,
    prepTime,
    cookTime,
    servings: 2 + (i % 4),
    difficulty,
    status: (i % 5 === 4 ? "Draft" : "Published") as RecipeStatus,
    categoryName,
    authorName: AUTHORS[i % AUTHORS.length],
    primaryImageUrl: null,
    createdAt: new Date(Date.UTC(2026, 9, 14 - i, 8)).toISOString(),
  }),
);

/** Cắt trang giống API thật để thử phân trang. */
export function getMockRecipePage(page: number, pageSize: number): PagedResult<RecipeSummaryDto> {
  const published = MOCK_RECIPES.filter((r) => r.status === "Published");
  const totalCount = published.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const current = Math.min(page, totalPages);

  return {
    items: published.slice((current - 1) * pageSize, current * pageSize),
    totalCount,
    page: current,
    pageSize,
    totalPages,
    hasNextPage: current < totalPages,
    hasPreviousPage: current > 1,
  };
}
