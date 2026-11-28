import { z } from "zod";

/*
 * Schema form công thức. Ô số giữ dạng chuỗi trong form (ô trống không thành NaN),
 * Zod kiểm tra rồi đổi sang number. Giới hạn trùng với FluentValidation ở backend.
 */

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"] as const;

/** Số nguyên bắt buộc trong khoảng [min, max]. */
const requiredInt = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: `Nhập ${label}.` })
    .regex(/^\d+$/, { error: `${label[0]!.toUpperCase()}${label.slice(1)} phải là số nguyên.` })
    .transform(Number)
    .pipe(z.number().min(min, { error: `Từ ${min} đến ${max}.` }).max(max, { error: `Từ ${min} đến ${max}.` }));

/** Số không bắt buộc (cho phép dấu phẩy thập phân); ô trống thành null. */
const optionalNumber = (max: number, positive = false) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+([.,]\d+)?$/.test(v), { error: "Phải là số." })
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .refine((v) => v === null || (positive ? v > 0 : v >= 0), { error: positive ? "Phải lớn hơn 0." : "Không được âm." })
    .refine((v) => v === null || v <= max, { error: `Tối đa ${max.toLocaleString("vi-VN")}.` });

const optionalInt = (max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v), { error: "Phải là số nguyên." })
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || v <= max, { error: `Tối đa ${max}.` });

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, { error: min === 1 ? `Nhập ${label}.` : `${label} dài từ ${min} đến ${max} ký tự.` })
    .max(max, { error: `${label} tối đa ${max} ký tự.` });

export const ingredientFormSchema = z.object({
  /** Có id: nguyên liệu đã lưu; không có: dòng mới thêm. */
  id: z.string().optional(),
  name: text("tên nguyên liệu", 1, 100),
  quantity: optionalNumber(9_999_999, true),
  unit: z.string().trim().max(50, { error: "Đơn vị tối đa 50 ký tự." }),
  notes: z.string().trim().max(500, { error: "Ghi chú tối đa 500 ký tự." }),
});

export const stepFormSchema = z.object({
  id: z.string().optional(),
  title: text("tên bước", 1, 200),
  description: text("cách làm", 1, 2000),
  timerMinutes: optionalInt(10_000),
});

export const recipeFormSchema = z.object({
  title: text("Tên món", 5, 200),
  description: text("mô tả", 1, 2000),
  categoryId: z.string().min(1, { error: "Chọn danh mục." }),
  difficulty: z.enum(DIFFICULTIES, { error: "Chọn độ khó." }),
  prepTime: requiredInt("thời gian chuẩn bị", 1, 10_000),
  cookTime: requiredInt("thời gian nấu", 0, 10_000),
  servings: requiredInt("số khẩu phần", 1, 1000),
  instructions: z.string().trim().max(10_000, { error: "Ghi chú tối đa 10.000 ký tự." }),
  calories: optionalNumber(999_999),
  protein: optionalNumber(999_999),
  carbohydrates: optionalNumber(999_999),
  fat: optionalNumber(999_999),
  fiber: optionalNumber(999_999),
  sodium: optionalNumber(999_999),
  ingredients: z.array(ingredientFormSchema).max(100, { error: "Tối đa 100 nguyên liệu." }),
  steps: z.array(stepFormSchema).max(100, { error: "Tối đa 100 bước." }),
});

/** Giá trị trong form (chuỗi). */
export type RecipeFormInput = z.input<typeof recipeFormSchema>;
/** Giá trị sau khi Zod kiểm tra và đổi kiểu. */
export type RecipeFormValues = z.output<typeof recipeFormSchema>;
export type IngredientFormValues = z.output<typeof ingredientFormSchema>;
export type StepFormValues = z.output<typeof stepFormSchema>;
