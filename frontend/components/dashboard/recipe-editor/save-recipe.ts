import { manageApi } from "@/lib/api/manage";
import {
  basicsChanged,
  planChildChanges,
  planStepMoves,
  sameIngredient,
  sameStepContent,
  toIngredientInput,
  toStepInput,
  toUpdateRequest,
} from "@/lib/recipe-form";
import type { RecipeFormValues } from "@/lib/validation/recipe";
import type { RecipeDetailDto } from "@/types";

/**
 * Lưu form sửa công thức. API tách riêng thông tin chính, nguyên liệu và bước nên:
 * 1. PUT thông tin chính (kèm rowVersion) nếu có đổi;
 * 2. thêm mới trước, xóa sau (bài đã đăng phải luôn còn ít nhất 1 nguyên liệu, 1 bước);
 * 3. cuối cùng sắp lại thứ tự bước.
 * Trả về bản mới nhất đọc lại từ máy chủ.
 *
 * Nếu một lệnh giữa chừng lỗi, các lệnh trước đó đã được lưu: hàm ném PartialSaveError để form
 * tải lại công thức (rowVersion mới) và ghi id của dòng vừa tạo qua onCreated, tránh lần lưu sau
 * bị 409 hoặc thêm trùng nguyên liệu/bước.
 */
export class PartialSaveError extends Error {
  constructor(cause: unknown) {
    super("Đã lưu một phần thay đổi", { cause });
    this.name = "PartialSaveError";
  }
}

export interface SaveHooks {
  /** Dòng mới đã được tạo trên máy chủ: ghi lại id vào form. */
  onCreated?: (list: "ingredients" | "steps", index: number, id: string) => void;
}

export async function saveRecipeChanges(
  recipe: RecipeDetailDto,
  values: RecipeFormValues,
  hooks: SaveHooks = {},
): Promise<RecipeDetailDto> {
  let wrote = false;
  const write = async <T,>(call: () => Promise<T>) => {
    const result = await call();
    wrote = true;
    return result;
  };
  try {
    await applyChanges(recipe, values, write, hooks);
  } catch (error) {
    throw wrote ? new PartialSaveError(error) : error;
  }
  return manageApi.get(recipe.id);
}

async function applyChanges(
  recipe: RecipeDetailDto,
  values: RecipeFormValues,
  write: <T>(call: () => Promise<T>) => Promise<T>,
  { onCreated }: SaveHooks,
) {
  const id = recipe.id;

  if (basicsChanged(recipe, values)) await write(() => manageApi.update(id, toUpdateRequest(values, recipe.rowVersion)));

  // ----- Nguyên liệu -----
  const ingredients = planChildChanges(recipe.ingredients, values.ingredients, sameIngredient);
  for (const { item, index } of ingredients.added) {
    const created = await write(() => manageApi.addIngredient(id, toIngredientInput(item, index)));
    onCreated?.("ingredients", index, created.id);
  }
  for (const { item, index } of ingredients.changed)
    await write(() => manageApi.updateIngredient(id, item.id, toIngredientInput(item, index)));
  for (const ingredientId of ingredients.removed) await write(() => manageApi.deleteIngredient(id, ingredientId));

  // ----- Bước làm -----
  const steps = planChildChanges(recipe.steps, values.steps, (before, after) => sameStepContent(before, after));
  const desiredIds = values.steps.map((s) => s.id ?? "");
  const added: string[] = [];
  for (const { item, index } of steps.added) {
    const created = await write(() => manageApi.addStep(id, toStepInput(item)));
    onCreated?.("steps", index, created.id);
    desiredIds[index] = created.id;
    added.push(created.id);
  }
  for (const { item } of steps.changed) await write(() => manageApi.updateStep(id, item.id, toStepInput(item)));
  for (const stepId of steps.removed) await write(() => manageApi.deleteStep(id, stepId));

  // Thứ tự trên máy chủ lúc này: bước cũ còn giữ (theo số thứ tự) rồi tới các bước vừa thêm.
  const serverOrder = [...recipe.steps]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map((s) => s.id)
    .filter((stepId) => !steps.removed.includes(stepId))
    .concat(added);
  const byId = new Map(values.steps.map((s, i) => [desiredIds[i], s]));
  for (const move of planStepMoves(serverOrder, desiredIds))
    await write(() => manageApi.updateStep(id, move.id, toStepInput(byId.get(move.id)!, move.position)));
}
