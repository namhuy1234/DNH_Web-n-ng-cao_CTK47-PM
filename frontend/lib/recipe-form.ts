import type {
  CreateRecipeRequest,
  IngredientDto,
  IngredientInput,
  RecipeDetailDto,
  StepDto,
  StepInput,
  UpdateRecipeRequest,
} from "@/types";
import type {
  IngredientFormValues,
  RecipeFormInput,
  RecipeFormValues,
  StepFormValues,
} from "./validation/recipe.ts";

/*
 * Chuyển đổi giữa dữ liệu API và form công thức, và lập kế hoạch đồng bộ nguyên liệu/bước.
 * Toàn hàm thuần (không gọi API) để kiểm thử được bằng node:test.
 */

const str = (value: number | string | null | undefined) => (value === null || value === undefined ? "" : String(value));

export const EMPTY_INGREDIENT: RecipeFormInput["ingredients"][number] = { name: "", quantity: "", unit: "", notes: "" };
export const EMPTY_STEP: RecipeFormInput["steps"][number] = { title: "", description: "", timerMinutes: "" };

/** Giá trị ban đầu của form: trống khi tạo mới, lấy từ công thức khi sửa. */
export function toFormValues(recipe?: RecipeDetailDto): RecipeFormInput {
  if (!recipe) {
    return {
      title: "",
      description: "",
      categoryId: "",
      difficulty: "Easy",
      prepTime: "15",
      cookTime: "30",
      servings: "2",
      instructions: "",
      calories: "",
      protein: "",
      carbohydrates: "",
      fat: "",
      fiber: "",
      sodium: "",
      ingredients: [{ ...EMPTY_INGREDIENT }],
      steps: [{ ...EMPTY_STEP }],
    };
  }

  const n = recipe.nutrition;
  return {
    title: recipe.title,
    description: recipe.description,
    categoryId: recipe.categoryId,
    difficulty: recipe.difficulty,
    prepTime: str(recipe.prepTime),
    cookTime: str(recipe.cookTime),
    servings: str(recipe.servings),
    instructions: recipe.instructions ?? "",
    calories: str(n?.calories),
    protein: str(n?.protein),
    carbohydrates: str(n?.carbohydrates),
    fat: str(n?.fat),
    fiber: str(n?.fiber),
    sodium: str(n?.sodium),
    ingredients: [...recipe.ingredients]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((i) => ({ id: i.id, name: i.name, quantity: str(i.quantity), unit: i.unit ?? "", notes: i.notes ?? "" })),
    steps: [...recipe.steps]
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((s) => ({ id: s.id, title: s.title, description: s.description, timerMinutes: str(s.timerMinutes) })),
  };
}

const orNull = (value: string) => (value === "" ? null : value);

/** Thứ tự nguyên liệu bắt đầu từ 1, giống cách backend tự đánh số. */
export function toIngredientInput(item: IngredientFormValues, index: number): IngredientInput {
  return { name: item.name, quantity: item.quantity, unit: orNull(item.unit), notes: orNull(item.notes), orderIndex: index + 1 };
}

export function toStepInput(item: StepFormValues, stepNumber?: number): StepInput {
  return { title: item.title, description: item.description, timerMinutes: item.timerMinutes, imageUrl: null, stepNumber };
}

function nutritionOf(values: RecipeFormValues) {
  const { calories, protein, carbohydrates, fat, fiber, sodium } = values;
  return { calories, protein, carbohydrates, fat, fiber, sodium };
}

function basics(values: RecipeFormValues) {
  return {
    title: values.title,
    description: values.description,
    categoryId: values.categoryId,
    difficulty: values.difficulty,
    prepTime: values.prepTime,
    cookTime: values.cookTime,
    servings: values.servings,
    instructions: values.instructions,
  };
}

export function toCreateRequest(values: RecipeFormValues): CreateRecipeRequest {
  const nutrition = nutritionOf(values);
  return {
    ...basics(values),
    // Không nhập ô dinh dưỡng nào thì không gửi.
    nutrition: Object.values(nutrition).some((v) => v !== null) ? nutrition : undefined,
    ingredients: values.ingredients.map(toIngredientInput),
    steps: values.steps.map((s, i) => toStepInput(s, i + 1)),
  };
}

/** Khi sửa luôn gửi dinh dưỡng (kể cả toàn null) để xóa được giá trị cũ. */
export function toUpdateRequest(values: RecipeFormValues, rowVersion: string): UpdateRecipeRequest {
  return { ...basics(values), nutrition: nutritionOf(values), rowVersion };
}

/** Thông tin cơ bản có thay đổi không (để chỉ gọi PUT khi cần, tránh đổi rowVersion vô ích). */
export function basicsChanged(recipe: RecipeDetailDto, values: RecipeFormValues) {
  const before = toUpdateRequest(
    {
      ...values,
      title: recipe.title,
      description: recipe.description,
      categoryId: recipe.categoryId,
      difficulty: recipe.difficulty,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      instructions: recipe.instructions ?? "",
      calories: recipe.nutrition?.calories ?? null,
      protein: recipe.nutrition?.protein ?? null,
      carbohydrates: recipe.nutrition?.carbohydrates ?? null,
      fat: recipe.nutrition?.fat ?? null,
      fiber: recipe.nutrition?.fiber ?? null,
      sodium: recipe.nutrition?.sodium ?? null,
    },
    recipe.rowVersion,
  );
  return JSON.stringify(before) !== JSON.stringify(toUpdateRequest(values, recipe.rowVersion));
}

export interface ChildPlan<T> {
  /** Có trong bản gốc nhưng đã bị xóa khỏi form. */
  removed: string[];
  /** Dòng mới (chưa có id) kèm vị trí trong form. */
  added: { item: T; index: number }[];
  /** Dòng cũ có nội dung hoặc vị trí khác bản gốc. */
  changed: { item: T & { id: string }; index: number }[];
}

/** So sánh danh sách gốc (từ API) với danh sách trong form. */
export function planChildChanges<T extends { id?: string }, O extends { id: string }>(
  original: O[],
  current: T[],
  isSame: (before: O, after: T, index: number) => boolean,
): ChildPlan<T> {
  const byId = new Map(original.map((o) => [o.id, o]));
  const kept = new Set(current.flatMap((c) => (c.id && byId.has(c.id) ? [c.id] : [])));

  const plan: ChildPlan<T> = { removed: original.filter((o) => !kept.has(o.id)).map((o) => o.id), added: [], changed: [] };
  current.forEach((item, index) => {
    const before = item.id ? byId.get(item.id) : undefined;
    if (!before) plan.added.push({ item, index });
    else if (!isSame(before, item, index)) plan.changed.push({ item: item as T & { id: string }, index });
  });
  return plan;
}

export function sameIngredient(before: IngredientDto, after: IngredientFormValues, index: number) {
  const input = toIngredientInput(after, index);
  return (
    before.name === input.name &&
    (before.quantity ?? null) === (input.quantity ?? null) &&
    (before.unit ?? null) === (input.unit ?? null) &&
    (before.notes ?? null) === (input.notes ?? null) &&
    before.orderIndex === input.orderIndex
  );
}

/** Vị trí bước được xử lý riêng (planStepMoves) nên chỉ so nội dung. */
export function sameStepContent(before: StepDto, after: StepFormValues) {
  return (
    before.title === after.title &&
    before.description === after.description &&
    (before.timerMinutes ?? null) === (after.timerMinutes ?? null)
  );
}

/**
 * Các lần "chuyển bước tới vị trí" cần gọi để thứ tự trên server khớp form.
 * Backend xử lý một lần chuyển bằng cách lấy bước ra rồi chèn vào vị trí mới,
 * nên mô phỏng y như vậy và chỉ sinh lệnh khi vị trí còn lệch.
 */
export function planStepMoves(serverOrder: string[], desired: string[]): { id: string; position: number }[] {
  const order = serverOrder.filter((id) => desired.includes(id));
  const moves: { id: string; position: number }[] = [];

  desired.forEach((id, index) => {
    if (order[index] === id) return;
    order.splice(order.indexOf(id), 1);
    order.splice(index, 0, id);
    moves.push({ id, position: index + 1 });
  });
  return moves;
}

/** Điều kiện đăng bài (giống quy tắc RECIPE_PUBLISH_INCOMPLETE ở backend). */
export function publishChecklist(recipe: Pick<RecipeDetailDto, "ingredients" | "steps" | "images">) {
  return [
    { label: "Có ít nhất 1 nguyên liệu", ok: recipe.ingredients.length > 0, required: true },
    { label: "Có ít nhất 1 bước thực hiện", ok: recipe.steps.length > 0, required: true },
    { label: "Có ảnh minh họa (nên có)", ok: recipe.images.length > 0, required: false },
  ];
}
