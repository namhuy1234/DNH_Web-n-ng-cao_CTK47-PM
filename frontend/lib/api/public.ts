import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { apiGet } from "./server";
import type {
  CategoryDetailDto,
  PagedResult,
  RecipeDetailDto,
  RecipeDifficulty,
  RecipeSort,
  RecipeSummaryDto,
} from "@/types";

/*
 * Dữ liệu công khai lấy phía server, cache vài phút và gắn tag để Lab 8 làm mới
 * (revalidateTag) khi tác giả đăng hoặc sửa bài. Mọi người xem dùng chung kết quả
 * nên server Next.js không gọi API liên tục. Lỗi được ném ra nên không bị cache.
 */

const EMPTY_PAGE: PagedResult<RecipeSummaryDto> = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export interface RecipeListParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  difficulty?: RecipeDifficulty;
  sort?: RecipeSort;
}

/** GET /recipes: danh sách công thức đã đăng, có lọc và sắp xếp. */
export async function getRecipes(params: RecipeListParams = {}) {
  "use cache";
  cacheLife("minutes");
  cacheTag("recipes");

  return (await apiGet<PagedResult<RecipeSummaryDto>>("/recipes", { ...params })) ?? EMPTY_PAGE;
}

export interface RecipeSearchParams {
  q?: string;
  page?: number;
  pageSize?: number;
  categoryId?: string;
  difficulty?: RecipeDifficulty;
}

/** GET /recipes/search: tìm toàn văn (không phân biệt dấu) theo tên, mô tả, nguyên liệu. */
export async function searchRecipes(params: RecipeSearchParams) {
  "use cache";
  cacheLife("minutes");
  cacheTag("recipes");

  return (await apiGet<PagedResult<RecipeSummaryDto>>("/recipes/search", { ...params })) ?? EMPTY_PAGE;
}

/** GET /recipes/{slug}: chi tiết công thức; null nếu không có (hoặc là bản nháp). */
export async function getRecipe(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("recipes", `recipe-${slug}`);

  return apiGet<RecipeDetailDto>(`/recipes/${encodeURIComponent(slug)}`);
}

/** GET /categories/{slug}: danh mục kèm công thức thuộc danh mục, có phân trang. */
export async function getCategory(slug: string, page = 1, pageSize = 12) {
  "use cache";
  cacheLife("minutes");
  cacheTag("categories", "recipes");

  return apiGet<CategoryDetailDto>(`/categories/${encodeURIComponent(slug)}`, { page, pageSize });
}
