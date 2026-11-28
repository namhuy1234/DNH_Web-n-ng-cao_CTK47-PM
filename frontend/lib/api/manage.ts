import { http } from "./client";
import type {
  CreateRecipeRequest,
  ImageDto,
  IngredientDto,
  IngredientInput,
  LogFileDto,
  LogPageDto,
  LogQuery,
  ManageRecipeQuery,
  ManagedRecipeDto,
  PagedResult,
  RecipeDetailDto,
  RecipeScope,
  RecipeStatsDto,
  RecipeStatusAction,
  StepDto,
  StepInput,
  UpdateImageRequest,
  UpdateRecipeRequest,
  UserListItemDto,
  UserListQuery,
  UserProfileDto,
} from "@/types";

/** Gửi multipart: phải ghi rõ Content-Type, nếu không axios đổi FormData thành JSON (mặc định của apiClient). */
const MULTIPART = { "Content-Type": "multipart/form-data" };

/** Tải một file lên, báo tiến độ 0–100. */
function uploadFile<T>(url: string, file: File, fields: Record<string, string> = {}, onProgress?: (percent: number) => void) {
  const form = new FormData();
  form.append("file", file);
  for (const [key, value] of Object.entries(fields)) form.append(key, value);

  return http.post<T>(url, form, {
    headers: MULTIPART,
    // Ảnh lớn qua mạng chậm cần nhiều thời gian hơn mức 10 giây mặc định.
    timeout: 120_000,
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
}

const id = (value: string) => encodeURIComponent(value);

/** Trang quản lý công thức: mọi trạng thái, chỉ chủ bài hoặc admin. */
export const manageApi = {
  list: (query: ManageRecipeQuery = {}) =>
    http.get<PagedResult<ManagedRecipeDto>>("/recipes/manage", { params: query }),
  stats: (scope: RecipeScope = "mine") => http.get<RecipeStatsDto>("/recipes/manage/stats", { params: { scope } }),
  get: (recipeId: string) => http.get<RecipeDetailDto>(`/recipes/manage/${id(recipeId)}`),

  create: (body: CreateRecipeRequest) => http.post<RecipeDetailDto>("/recipes", body),
  update: (recipeId: string, body: UpdateRecipeRequest) =>
    http.put<RecipeDetailDto>(`/recipes/${id(recipeId)}`, body, { headers: { "If-Match": `"${body.rowVersion}"` } }),
  changeStatus: (recipeId: string, action: RecipeStatusAction) =>
    http.patch<RecipeDetailDto>(`/recipes/${id(recipeId)}/${action}`),
  remove: (recipeId: string) => http.delete(`/recipes/${id(recipeId)}`),

  addIngredient: (recipeId: string, body: IngredientInput) =>
    http.post<IngredientDto>(`/recipes/${id(recipeId)}/ingredients`, body),
  updateIngredient: (recipeId: string, ingredientId: string, body: IngredientInput) =>
    http.put<IngredientDto>(`/recipes/${id(recipeId)}/ingredients/${id(ingredientId)}`, body),
  deleteIngredient: (recipeId: string, ingredientId: string) =>
    http.delete(`/recipes/${id(recipeId)}/ingredients/${id(ingredientId)}`),

  addStep: (recipeId: string, body: StepInput) => http.post<StepDto>(`/recipes/${id(recipeId)}/steps`, body),
  updateStep: (recipeId: string, stepId: string, body: StepInput) =>
    http.put<StepDto>(`/recipes/${id(recipeId)}/steps/${id(stepId)}`, body),
  deleteStep: (recipeId: string, stepId: string) => http.delete(`/recipes/${id(recipeId)}/steps/${id(stepId)}`),

  uploadImage: (recipeId: string, file: File, altText: string, onProgress?: (percent: number) => void) =>
    uploadFile<ImageDto>(`/recipes/${id(recipeId)}/images`, file, altText ? { altText } : {}, onProgress),
  updateImage: (recipeId: string, imageId: string, body: UpdateImageRequest) =>
    http.patch<ImageDto>(`/recipes/${id(recipeId)}/images/${id(imageId)}`, body),
  deleteImage: (recipeId: string, imageId: string) => http.delete(`/recipes/${id(recipeId)}/images/${id(imageId)}`),
};

/** Ảnh đại diện của người đang đăng nhập. */
export const avatarApi = {
  upload: (file: File, onProgress?: (percent: number) => void) =>
    uploadFile<UserProfileDto>("/auth/me/avatar", file, {}, onProgress),
};

/** Quản lý người dùng (Admin). */
export const usersApi = {
  list: (query: UserListQuery = {}) => http.get<PagedResult<UserListItemDto>>("/users", { params: query }),
  lock: (userId: string) => http.patch<UserListItemDto>(`/users/${id(userId)}/lock`),
  unlock: (userId: string) => http.patch<UserListItemDto>(`/users/${id(userId)}/unlock`),
};

/** Nhật ký hệ thống (Admin). */
export const logsApi = {
  list: (query: LogQuery = {}) => http.get<LogPageDto>("/admin/logs", { params: query }),
  files: () => http.get<LogFileDto[]>("/admin/logs/files"),
};
