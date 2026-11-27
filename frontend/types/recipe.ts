export type RecipeDifficulty = "Easy" | "Medium" | "Hard" | "Expert";
export type RecipeStatus = "Draft" | "Published" | "Archived";
export type RecipeSort = "-createdAt" | "createdAt" | "title" | "-title" | "cookTime" | "-cookTime";

export interface RecipeSummaryDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  status: RecipeStatus;
  categoryName: string;
  authorName: string;
  primaryImageUrl: string | null;
  createdAt: string;
}

export interface IngredientDto {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  orderIndex: number;
}

export interface StepDto {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  timerMinutes: number | null;
  imageUrl: string | null;
}

export interface ImageDto {
  id: string;
  originalUrl: string;
  altText: string | null;
  isPrimary: boolean;
  orderIndex: number;
}

export interface NutritionDto {
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null;
}

export interface RecipeDetailDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructions: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  status: RecipeStatus;
  publishedAt: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  authorId: string;
  authorName: string;
  /** Gửi lại khi cập nhật để phát hiện sửa đồng thời. */
  rowVersion: string;
  nutrition: NutritionDto | null;
  ingredients: IngredientDto[];
  steps: StepDto[];
  images: ImageDto[];
}

export interface IngredientInput {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  orderIndex?: number;
}

export interface StepInput {
  title: string;
  description: string;
  timerMinutes?: number | null;
  imageUrl?: string | null;
  stepNumber?: number;
}

export interface CreateRecipeRequest {
  title: string;
  description: string;
  categoryId: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  instructions?: string;
  nutrition?: Partial<NutritionDto>;
  ingredients?: IngredientInput[];
  steps?: StepInput[];
}

export type UpdateRecipeRequest = Omit<CreateRecipeRequest, "ingredients" | "steps"> & {
  rowVersion: string;
};

export interface UpdateImageRequest {
  altText?: string;
  isPrimary?: boolean;
  orderIndex?: number;
}

export interface RecipeListQuery {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  difficulty?: RecipeDifficulty;
  maxCookTime?: number;
  minServings?: number;
  sort?: RecipeSort;
}

export interface RecipeSearchQuery {
  q: string;
  page?: number;
  pageSize?: number;
  categoryId?: string;
  difficulty?: RecipeDifficulty;
}
