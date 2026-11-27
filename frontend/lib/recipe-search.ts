import type { RecipeDifficulty, RecipeSort } from "@/types";

export const DIFFICULTIES: RecipeDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];
export const SORTS: RecipeSort[] = ["-createdAt", "createdAt", "title", "-title", "cookTime", "-cookTime"];

export interface RecipeFilterValues {
  q: string;
  categoryId?: string;
  difficulty?: RecipeDifficulty;
  sort: RecipeSort;
  page: number;
}

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Đọc bộ lọc từ URL; giá trị lạ (hoặc "all", chuỗi rỗng) bị bỏ qua thay vì làm lỗi trang.
 * categoryId sai định dạng bị bỏ vì backend sẽ trả 400 với Guid không hợp lệ.
 */
export function parseRecipeFilters(params: Params): RecipeFilterValues {
  const difficulty = first(params.difficulty) as RecipeDifficulty;
  const sort = first(params.sort) as RecipeSort;
  const categoryId = first(params.categoryId);
  const page = Number(first(params.page));
  return {
    q: first(params.q).slice(0, 100),
    categoryId: GUID.test(categoryId) ? categoryId.toLowerCase() : undefined,
    difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : undefined,
    sort: SORTS.includes(sort) ? sort : "-createdAt",
    page: Number.isInteger(page) && page > 0 && page <= 10_000 ? page : 1,
  };
}

/** Giá trị bộ lọc cần giữ khi chuyển trang (bỏ trang và giá trị mặc định). */
export function filterQuery(filters: RecipeFilterValues, keys: (keyof RecipeFilterValues)[]) {
  const query: Record<string, string | undefined> = {};
  for (const key of keys) {
    const value = filters[key];
    if (key === "page" || value === undefined || value === "") continue;
    if (key === "sort" && value === "-createdAt") continue;
    query[key] = String(value);
  }
  return query;
}
