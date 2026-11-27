import { http } from "./client";
import type { PagedResult, RecipeDetailDto, RecipeListQuery, RecipeSearchQuery, RecipeSummaryDto } from "@/types";

/** Các lời gọi API công thức (chạy ở trình duyệt); axios tự bỏ tham số undefined. */
export const recipesApi = {
  list: (query: RecipeListQuery = {}) => http.get<PagedResult<RecipeSummaryDto>>("/recipes", { params: query }),
  search: (query: RecipeSearchQuery) => http.get<PagedResult<RecipeSummaryDto>>("/recipes/search", { params: query }),
  getBySlug: (slug: string) => http.get<RecipeDetailDto>(`/recipes/${encodeURIComponent(slug)}`),
};
