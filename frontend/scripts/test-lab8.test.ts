// Unit test Lab 8 (form công thức, trạng thái, kiểm tra ảnh): npm run test:utils
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkImageFile, formatBytes, MAX_IMAGE_BYTES } from "../lib/image-file.ts";
import {
  basicsChanged,
  planChildChanges,
  planStepMoves,
  publishChecklist,
  sameIngredient,
  toCreateRequest,
  toFormValues,
  toUpdateRequest,
} from "../lib/recipe-form.ts";
import { availableActions } from "../lib/recipe-status.ts";
import { recipeFormSchema } from "../lib/validation/recipe.ts";
import type { RecipeDetailDto } from "../types/index.ts";

const recipe: RecipeDetailDto = {
  id: "r1",
  title: "Phở bò Hà Nội",
  slug: "pho-bo-ha-noi",
  description: "Nước dùng trong, thơm quế hồi.",
  instructions: "",
  prepTime: 30,
  cookTime: 180,
  servings: 4,
  difficulty: "Medium",
  status: "Draft",
  publishedAt: null,
  categoryId: "c1",
  categoryName: "Món nước",
  categorySlug: "mon-nuoc",
  authorId: "u1",
  authorName: "Huy",
  rowVersion: "rv1",
  nutrition: { calories: 450, protein: 30, carbohydrates: 50, fat: 12, fiber: 2, sodium: 900 },
  ingredients: [
    { id: "i1", name: "Xương bò", quantity: 1000, unit: "g", notes: null, orderIndex: 1 },
    { id: "i2", name: "Bánh phở", quantity: 500, unit: "g", notes: null, orderIndex: 2 },
  ],
  steps: [
    { id: "s1", stepNumber: 1, title: "Ninh xương", description: "Ninh 3 giờ.", timerMinutes: 180, imageUrl: null },
    { id: "s2", stepNumber: 2, title: "Trụng phở", description: "Trụng nhanh.", timerMinutes: null, imageUrl: null },
  ],
  images: [],
};

const parse = (input: ReturnType<typeof toFormValues>) => recipeFormSchema.parse(input);

describe("recipeFormSchema", () => {
  it("đổi ô số dạng chuỗi sang number, ô trống thành null", () => {
    const values = parse({ ...toFormValues(recipe), calories: "", protein: "12,5" });
    assert.equal(values.prepTime, 30);
    assert.equal(values.calories, null);
    assert.equal(values.protein, 12.5);
  });

  it("báo lỗi tên món quá ngắn, thời gian không phải số, số lượng âm", () => {
    const form = toFormValues(recipe);
    const result = recipeFormSchema.safeParse({
      ...form,
      title: "Phở",
      prepTime: "abc",
      ingredients: [{ ...form.ingredients[0]!, quantity: "-1" }],
    });
    assert.equal(result.success, false);
    const paths = result.error!.issues.map((i) => i.path.join("."));
    assert.ok(paths.includes("title"));
    assert.ok(paths.includes("prepTime"));
    assert.ok(paths.includes("ingredients.0.quantity"));
  });

  it("form mới có giá trị mặc định hợp lệ trừ các ô bắt buộc", () => {
    const result = recipeFormSchema.safeParse(toFormValues());
    assert.equal(result.success, false);
    const paths = new Set(result.error!.issues.map((i) => i.path[0]));
    assert.deepEqual([...paths].sort(), ["categoryId", "description", "ingredients", "steps", "title"]);
  });
});

describe("chuyển form sang request", () => {
  it("tạo mới gửi kèm nguyên liệu và bước đã đánh số", () => {
    const body = toCreateRequest(parse({ ...toFormValues(recipe), calories: "", protein: "", carbohydrates: "", fat: "", fiber: "", sodium: "" }));
    assert.equal(body.nutrition, undefined); // không nhập dinh dưỡng thì không gửi
    assert.deepEqual(body.steps!.map((s) => s.stepNumber), [1, 2]);
    assert.deepEqual(body.ingredients!.map((i) => i.orderIndex), [1, 2]);
    assert.equal(body.ingredients![0]!.notes, null); // ô trống thành null
  });

  it("cập nhật luôn gửi dinh dưỡng và rowVersion", () => {
    const body = toUpdateRequest(parse({ ...toFormValues(recipe), fat: "" }), "rv1");
    assert.equal(body.rowVersion, "rv1");
    assert.equal(body.nutrition!.fat, null);
    assert.equal(body.nutrition!.sodium, 900);
  });

  it("basicsChanged chỉ đúng khi thông tin chính đổi", () => {
    assert.equal(basicsChanged(recipe, parse(toFormValues(recipe))), false);
    assert.equal(basicsChanged(recipe, parse({ ...toFormValues(recipe), servings: "6" })), true);
    // Đổi nguyên liệu không tính là đổi thông tin chính.
    const form = toFormValues(recipe);
    assert.equal(basicsChanged(recipe, parse({ ...form, ingredients: [form.ingredients[1]!] })), false);
  });
});

describe("planChildChanges", () => {
  it("phân loại dòng thêm, sửa, xóa", () => {
    const form = parse(toFormValues(recipe));
    const current = [
      { ...form.ingredients[1]!, quantity: 600 }, // sửa số lượng và đổi chỗ
      { name: "Hành tây", quantity: null, unit: "", notes: "" }, // dòng mới
    ];
    const plan = planChildChanges(recipe.ingredients, current, sameIngredient);
    assert.deepEqual(plan.removed, ["i1"]);
    assert.deepEqual(plan.added.map((a) => [a.item.name, a.index]), [["Hành tây", 1]]);
    assert.deepEqual(plan.changed.map((c) => c.item.id), ["i2"]);
  });

  it("không có thay đổi thì kế hoạch rỗng", () => {
    const plan = planChildChanges(recipe.ingredients, parse(toFormValues(recipe)).ingredients, sameIngredient);
    assert.deepEqual(plan, { removed: [], added: [], changed: [] });
  });
});

describe("planStepMoves", () => {
  it("đã đúng thứ tự thì không chuyển", () => assert.deepEqual(planStepMoves(["a", "b", "c"], ["a", "b", "c"]), []));
  it("đảo bước cuối lên đầu chỉ cần 1 lần", () =>
    assert.deepEqual(planStepMoves(["a", "b", "c"], ["c", "a", "b"]), [{ id: "c", position: 1 }]));
  it("đảo ngược toàn bộ", () => {
    const moves = planStepMoves(["a", "b", "c", "d"], ["d", "c", "b", "a"]);
    // Mô phỏng lại các lần chuyển như backend để chắc thứ tự cuối đúng.
    const order = ["a", "b", "c", "d"];
    for (const m of moves) {
      order.splice(order.indexOf(m.id), 1);
      order.splice(m.position - 1, 0, m.id);
    }
    assert.deepEqual(order, ["d", "c", "b", "a"]);
    assert.equal(moves.length, 3);
  });
  it("bỏ qua bước đã xóa", () => assert.deepEqual(planStepMoves(["a", "x", "b"], ["b", "a"]), [{ id: "b", position: 1 }]));
});

describe("trạng thái công thức", () => {
  const actions = (status: RecipeDetailDto["status"], deleted = false) => availableActions(status, deleted).map((a) => a.action);
  it("bản nháp: đăng hoặc xóa", () => assert.deepEqual(actions("Draft"), ["publish", "delete"]));
  it("đã đăng: gỡ, lưu trữ, xóa", () => assert.deepEqual(actions("Published"), ["unpublish", "archive", "delete"]));
  it("lưu trữ: đăng lại, về nháp, xóa", () => assert.deepEqual(actions("Archived"), ["publish", "unpublish", "delete"]));
  it("đã xóa: chỉ khôi phục", () => assert.deepEqual(actions("Published", true), ["restore"]));
  it("checklist đăng bài", () => {
    const list = publishChecklist({ ...recipe, steps: [] });
    assert.deepEqual(list.map((c) => c.ok), [true, false, false]);
    assert.equal(list[2]!.required, false); // ảnh chỉ khuyến nghị
  });
});

describe("kiểm tra ảnh ở trình duyệt", () => {
  it("nhận JPEG nhỏ", () => assert.equal(checkImageFile({ type: "image/jpeg", size: 1000 }), null));
  it("từ chối GIF và SVG", () => {
    assert.match(checkImageFile({ type: "image/gif", size: 10 })!, /JPEG, PNG/);
    assert.ok(checkImageFile({ type: "image/svg+xml", size: 10 }));
  });
  it("từ chối ảnh quá 5 MB", () => assert.match(checkImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })!, /5 MB/));
  it("formatBytes", () => {
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(1536), "1,5 KB");
    assert.equal(formatBytes(5 * 1024 * 1024), "5 MB");
  });
});
