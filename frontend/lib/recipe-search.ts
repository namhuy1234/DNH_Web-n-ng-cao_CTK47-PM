import type { RecipeDifficulty, RecipeSort, RecipeSummaryDto } from "@/types";

export const DIFFICULTIES: RecipeDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];
export const SORTS: RecipeSort[] = ["-createdAt", "createdAt", "title", "-title", "cookTime", "-cookTime"];

export interface RecipeFilterValues {
  q: string;
  difficulty?: RecipeDifficulty;
  sort: RecipeSort;
}

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

/** Đọc bộ lọc từ URL; giá trị lạ (hoặc "all", chuỗi rỗng) bị bỏ qua thay vì làm lỗi trang. */
export function parseRecipeFilters(params: Params): RecipeFilterValues {
  const difficulty = first(params.difficulty) as RecipeDifficulty;
  const sort = first(params.sort) as RecipeSort;
  return {
    q: first(params.q).slice(0, 100),
    difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : undefined,
    sort: SORTS.includes(sort) ? sort : "-createdAt",
  };
}

/** Bỏ dấu tiếng Việt để "pho" tìm được "Phở" (backend dùng unaccent tương tự). */
export function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

/** Lọc và sắp xếp danh sách mẫu giống API GET /recipes/search. */
export function filterRecipes(recipes: RecipeSummaryDto[], { q, difficulty, sort }: RecipeFilterValues) {
  const keyword = normalizeText(q);
  const result = recipes.filter(
    (r) =>
      r.status === "Published" &&
      (!difficulty || r.difficulty === difficulty) &&
      (!keyword || normalizeText(`${r.title} ${r.description}`).includes(keyword)),
  );

  const desc = sort.startsWith("-");
  const field = (desc ? sort.slice(1) : sort) as "createdAt" | "title" | "cookTime";
  const compare = (a: RecipeSummaryDto, b: RecipeSummaryDto) =>
    field === "cookTime"
      ? a.cookTime - b.cookTime
      : field === "title"
        ? a.title.localeCompare(b.title, "vi")
        : a.createdAt.localeCompare(b.createdAt);

  return result.sort((a, b) => (desc ? compare(b, a) : compare(a, b)));
}
