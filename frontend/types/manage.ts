import type { RecipeDifficulty, RecipeStatus } from "./recipe";

/** Trạng thái lọc ở trang quản lý: ba trạng thái của công thức cộng thêm "Đã xóa" (xóa mềm). */
export type ManageStatus = RecipeStatus | "Deleted";
export type RecipeScope = "mine" | "all";

export interface ManagedRecipeDto {
  id: string;
  title: string;
  slug: string;
  status: RecipeStatus;
  isDeleted: boolean;
  difficulty: RecipeDifficulty;
  categoryName: string;
  authorId: string;
  authorName: string;
  primaryImageUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
}

export interface ManageRecipeQuery {
  page?: number;
  pageSize?: number;
  status?: ManageStatus;
  q?: string;
  scope?: RecipeScope;
}

export interface RecipeStatsDto {
  total: number;
  draft: number;
  published: number;
  archived: number;
  deleted: number;
}

/** Hành động đổi trạng thái tương ứng PATCH /recipes/{id}/{action}. */
export type RecipeStatusAction = "publish" | "unpublish" | "archive" | "restore";

// ----- Người dùng -----
export type UserStatusFilter = "active" | "locked";

export interface UserListItemDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
  isActive: boolean;
  /** Bị khóa tạm do nhập sai mật khẩu nhiều lần (khác với bị quản trị viên khóa). */
  isLockedOut: boolean;
  createdAt: string;
  recipeCount: number;
  publishedCount: number;
}

export interface UserListQuery {
  page?: number;
  pageSize?: number;
  role?: "Admin" | "Author";
  q?: string;
  status?: UserStatusFilter;
}

// ----- Nhật ký hệ thống -----
export type LogLevel = "Verbose" | "Debug" | "Information" | "Warning" | "Error" | "Fatal";

export interface LogEntryDto {
  timestamp: string;
  level: LogLevel;
  message: string;
  exception: string | null;
  sourceContext: string | null;
  correlationId: string | null;
  userId: string | null;
  requestMethod: string | null;
  requestPath: string | null;
  statusCode: number | null;
  elapsedMs: number | null;
}

export interface LogPageDto {
  date: string;
  items: LogEntryDto[];
  totalMatched: number;
  levelCounts: Record<LogLevel, number>;
}

export interface LogFileDto {
  date: string;
  sizeBytes: number;
}

export interface LogQuery {
  date?: string;
  level?: LogLevel;
  q?: string;
  take?: number;
}
