"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/common/Loading";
import { FormAlert, TextAreaField, TextField } from "@/components/forms/FormField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toApiError } from "@/lib/api/errors";
import { manageApi } from "@/lib/api/manage";
import { DIFFICULTY_LABELS } from "@/lib/format";
import { applyServerErrors } from "@/lib/forms";
import { EMPTY_INGREDIENT, EMPTY_STEP, toCreateRequest, toFormValues } from "@/lib/recipe-form";
import { recipeFormSchema, type RecipeFormInput, type RecipeFormValues } from "@/lib/validation/recipe";
import type { CategoryDto, RecipeDetailDto } from "@/types";
import { usePublicCacheRefresh } from "../shared";
import { PartialSaveError, saveRecipeChanges } from "./save-recipe";

const BASIC_FIELDS = ["title", "description", "categoryId", "difficulty", "prepTime", "cookTime", "servings", "instructions"] as const;

interface RecipeFormProps {
  categories: CategoryDto[];
  /** Có giá trị: sửa công thức; không có: tạo mới. */
  recipe?: RecipeDetailDto;
  onSaved?: (recipe: RecipeDetailDto) => void;
  /** Bị người khác sửa trước (409): tải lại bản mới nhất. */
  onReload?: () => void;
  /** Báo cho trang biết form còn thay đổi chưa lưu. */
  onDirtyChange?: (dirty: boolean) => void;
}

/** Form công thức dùng chung cho trang tạo mới và trang sửa. */
export function RecipeForm({ categories, recipe, onSaved, onReload, onDirtyChange }: RecipeFormProps) {
  const router = useRouter();
  const refreshCache = usePublicCacheRefresh();
  const isEdit = !!recipe;
  const [formError, setFormError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);

  const form = useForm<RecipeFormInput, unknown, RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: toFormValues(recipe),
  });
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = form;
  const ingredients = useFieldArray({ control, name: "ingredients" });
  const steps = useFieldArray({ control, name: "steps" });

  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  // Hỏi lại khi đóng tab lúc còn thay đổi chưa lưu.
  useEffect(() => {
    if (!isDirty || busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, busy]);

  function handleError(error: unknown) {
    const apiError = toApiError(error);
    if (apiError.status === 409 && isEdit) {
      setConflict(true);
      return;
    }
    setFormError(applyServerErrors(error, setError, BASIC_FIELDS));
  }

  async function submit(values: RecipeFormValues, publish: boolean) {
    setFormError(null);
    setBusy(publish ? "publish" : "save");
    try {
      if (recipe) {
        const saved = await saveRecipeChanges(recipe, values, {
          // Ghi id dòng vừa tạo vào form: nếu lệnh sau lỗi, lần lưu tiếp theo không thêm trùng.
          onCreated: (list, index, id) =>
            list === "ingredients" ? setValue(`ingredients.${index}.id`, id) : setValue(`steps.${index}.id`, id),
        });
        reset(toFormValues(saved));
        refreshCache();
        toast.success("Đã lưu thay đổi");
        onSaved?.(saved);
        return;
      }

      const created = await manageApi.create(toCreateRequest(values));
      reset(toFormValues(created)); // hết "chưa lưu" để chuyển trang không bị hỏi lại
      if (publish) {
        try {
          await manageApi.changeStatus(created.id, "publish");
          toast.success("Đã đăng công thức");
        } catch (error) {
          toast.warning(`Đã lưu nháp nhưng chưa đăng được: ${toApiError(error).message}`);
        }
      } else {
        toast.success("Đã lưu nháp. Giờ bạn có thể thêm ảnh cho món ăn.");
      }
      refreshCache();
      router.push(`/dashboard/recipes/${created.id}/edit`);
    } catch (error) {
      if (error instanceof PartialSaveError && recipe) {
        // Một phần đã lưu (rowVersion trên máy chủ đã đổi): nạp lại bản mới nhất làm mốc so sánh,
        // giữ nguyên nội dung người dùng đang nhập để sửa rồi lưu tiếp.
        const latest = await manageApi.get(recipe.id).catch(() => null);
        if (latest) onSaved?.(latest);
        refreshCache();
        const message = applyServerErrors(error.cause, setError, BASIC_FIELDS) ?? "Một số ô chưa hợp lệ.";
        setFormError(`Mới lưu được một phần thay đổi. ${message} Hãy sửa rồi bấm lưu lại.`);
        return;
      }
      handleError(error);
    } finally {
      setBusy(null);
    }
  }

  function onInvalid() {
    setFormError("Một số ô chưa hợp lệ, hãy kiểm tra các dòng báo đỏ.");
    // Đưa con trỏ tới ô lỗi đầu tiên (sau khi React vẽ lại) để người dùng thấy ngay.
    requestAnimationFrame(() => document.querySelector<HTMLElement>("form [aria-invalid='true']")?.focus());
  }

  return (
    <form onSubmit={handleSubmit((v) => submit(v, false), onInvalid)} noValidate className="space-y-6">
      {conflict && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Công thức vừa được sửa ở nơi khác</AlertTitle>
          <AlertDescription>
            <p>Để không ghi đè thay đổi của người khác, hãy tải lại bản mới nhất rồi sửa tiếp.</p>
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => onReload?.()}>
              <RotateCcw /> Tải lại bản mới nhất
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ----- Thông tin cơ bản ----- */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
          <CardDescription>Tên món dùng để tạo đường dẫn bài viết và không đổi đường dẫn khi sửa tên sau này.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField id="title" label="Tên món" placeholder="Ví dụ: Phở bò Hà Nội" error={errors.title?.message} {...register("title")} />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField
              id="description"
              label="Mô tả ngắn"
              rows={3}
              placeholder="Vài câu giới thiệu món ăn"
              error={errors.description?.message}
              {...register("description")}
            />
          </div>
          <SelectField id="categoryId" label="Danh mục" error={errors.categoryId?.message}>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="categoryId" className="w-full" aria-invalid={errors.categoryId ? true : undefined}>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </SelectField>
          <SelectField id="difficulty" label="Độ khó" error={errors.difficulty?.message}>
            <Controller
              control={control}
              name="difficulty"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="difficulty" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </SelectField>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <TextField id="prepTime" label="Chuẩn bị (phút)" inputMode="numeric" error={errors.prepTime?.message} {...register("prepTime")} />
            <TextField id="cookTime" label="Nấu (phút)" inputMode="numeric" error={errors.cookTime?.message} {...register("cookTime")} />
            <TextField id="servings" label="Khẩu phần" inputMode="numeric" error={errors.servings?.message} {...register("servings")} />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField
              id="instructions"
              label="Mẹo và ghi chú (không bắt buộc)"
              rows={3}
              placeholder="Ví dụ: nước dùng ngon hơn nếu ninh xương qua đêm"
              error={errors.instructions?.message}
              {...register("instructions")}
            />
          </div>
        </CardContent>
      </Card>

      {/* ----- Nguyên liệu ----- */}
      <Card>
        <CardHeader>
          <CardTitle>Nguyên liệu</CardTitle>
          <CardDescription>Số lượng để trống nếu tùy khẩu vị (ví dụ: muối, tiêu).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden grid-cols-[1fr_6rem_6rem_1fr_auto] gap-2 px-1 text-xs font-medium text-muted-foreground md:grid">
            <span>Tên nguyên liệu</span>
            <span>Số lượng</span>
            <span>Đơn vị</span>
            <span>Ghi chú</span>
            <span className="w-[6.5rem]" />
          </div>
          {ingredients.fields.map((field, index) => {
            const e = errors.ingredients?.[index];
            return (
              <div key={field.id} className="rounded-lg border p-2 md:border-0 md:p-0" data-testid="ingredient-row">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_6rem_6rem_1fr_auto]">
                  <Input
                    className="col-span-2 md:col-span-1"
                    aria-label={`Tên nguyên liệu ${index + 1}`}
                    placeholder="Ví dụ: Thịt bò"
                    aria-invalid={e?.name ? true : undefined}
                    {...register(`ingredients.${index}.name`)}
                  />
                  <Input
                    aria-label={`Số lượng nguyên liệu ${index + 1}`}
                    placeholder="500"
                    inputMode="decimal"
                    aria-invalid={e?.quantity ? true : undefined}
                    {...register(`ingredients.${index}.quantity`)}
                  />
                  <Input aria-label={`Đơn vị nguyên liệu ${index + 1}`} placeholder="g" {...register(`ingredients.${index}.unit`)} />
                  <Input
                    className="col-span-2 md:col-span-1"
                    aria-label={`Ghi chú nguyên liệu ${index + 1}`}
                    placeholder="Thái mỏng"
                    {...register(`ingredients.${index}.notes`)}
                  />
                  <RowActions
                    label={`nguyên liệu ${index + 1}`}
                    index={index}
                    count={ingredients.fields.length}
                    onMove={ingredients.move}
                    onRemove={() => ingredients.remove(index)}
                  />
                </div>
                <RowErrors messages={[e?.name?.message, e?.quantity?.message, e?.unit?.message, e?.notes?.message]} />
              </div>
            );
          })}
          <FormAlert message={errors.ingredients?.root?.message ?? errors.ingredients?.message} />
          <Button type="button" variant="outline" size="sm" onClick={() => ingredients.append({ ...EMPTY_INGREDIENT })}>
            <Plus /> Thêm nguyên liệu
          </Button>
        </CardContent>
      </Card>

      {/* ----- Các bước ----- */}
      <Card>
        <CardHeader>
          <CardTitle>Các bước thực hiện</CardTitle>
          <CardDescription>Dùng mũi tên để đổi thứ tự; số bước được đánh lại tự động.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.fields.map((field, index) => {
            const e = errors.steps?.[index];
            return (
              <div key={field.id} className="flex gap-3 rounded-lg border p-3" data-testid="step-row">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      aria-label={`Tên bước ${index + 1}`}
                      placeholder="Ví dụ: Sơ chế xương"
                      aria-invalid={e?.title ? true : undefined}
                      {...register(`steps.${index}.title`)}
                    />
                    <Input
                      className="sm:w-36"
                      aria-label={`Hẹn giờ bước ${index + 1} (phút)`}
                      placeholder="Hẹn giờ (phút)"
                      inputMode="numeric"
                      aria-invalid={e?.timerMinutes ? true : undefined}
                      {...register(`steps.${index}.timerMinutes`)}
                    />
                  </div>
                  <Textarea
                    rows={3}
                    aria-label={`Cách làm bước ${index + 1}`}
                    placeholder="Mô tả chi tiết việc cần làm"
                    aria-invalid={e?.description ? true : undefined}
                    {...register(`steps.${index}.description`)}
                  />
                  <RowErrors messages={[e?.title?.message, e?.timerMinutes?.message, e?.description?.message]} />
                </div>
                <RowActions
                  vertical
                  label={`bước ${index + 1}`}
                  index={index}
                  count={steps.fields.length}
                  onMove={steps.move}
                  onRemove={() => steps.remove(index)}
                />
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={() => steps.append({ ...EMPTY_STEP })}>
            <Plus /> Thêm bước
          </Button>
        </CardContent>
      </Card>

      {/* ----- Dinh dưỡng ----- */}
      <Card>
        <CardHeader>
          <CardTitle>Dinh dưỡng</CardTitle>
          <CardDescription>Tính cho một khẩu phần, không bắt buộc.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <TextField id="calories" label="Năng lượng (kcal)" inputMode="decimal" error={errors.calories?.message} {...register("calories")} />
          <TextField id="protein" label="Đạm (g)" inputMode="decimal" error={errors.protein?.message} {...register("protein")} />
          <TextField id="carbohydrates" label="Tinh bột (g)" inputMode="decimal" error={errors.carbohydrates?.message} {...register("carbohydrates")} />
          <TextField id="fat" label="Chất béo (g)" inputMode="decimal" error={errors.fat?.message} {...register("fat")} />
          <TextField id="fiber" label="Chất xơ (g)" inputMode="decimal" error={errors.fiber?.message} {...register("fiber")} />
          <TextField id="sodium" label="Natri (mg)" inputMode="decimal" error={errors.sodium?.message} {...register("sodium")} />
        </CardContent>
      </Card>

      {/* ----- Thanh lưu cố định ở đáy ----- */}
      <div className="sticky bottom-0 z-10 -mx-1 space-y-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <FormAlert message={formError} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isDirty && <span className="mr-auto text-sm text-muted-foreground">Có thay đổi chưa lưu</span>}
          {isEdit ? (
            <>
              <Button type="button" variant="outline" disabled={!isDirty || !!busy} onClick={() => reset(toFormValues(recipe))}>
                <RotateCcw /> Hoàn tác
              </Button>
              <Button type="submit" disabled={!isDirty || !!busy || conflict}>
                {busy ? <Spinner className="text-primary-foreground" /> : <Save />} Lưu thay đổi
              </Button>
            </>
          ) : (
            <>
              <Button type="submit" variant="outline" disabled={!!busy}>
                {busy === "save" ? <Spinner /> : <Save />} Lưu nháp
              </Button>
              <Button type="button" disabled={!!busy} onClick={handleSubmit((v) => submit(v, true), onInvalid)}>
                {busy === "publish" ? <Spinner className="text-primary-foreground" /> : <Send />} Lưu và đăng
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}

function SelectField({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function RowErrors({ messages }: { messages: (string | undefined)[] }) {
  const shown = messages.filter(Boolean);
  if (shown.length === 0) return null;
  return <p className="mt-1 text-sm text-destructive">{shown.join(" ")}</p>;
}

interface RowActionsProps {
  label: string;
  index: number;
  count: number;
  vertical?: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}

function RowActions({ label, index, count, vertical, onMove, onRemove }: RowActionsProps) {
  return (
    <div className={vertical ? "flex flex-col gap-1" : "flex items-center gap-1"}>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Đưa ${label} lên`} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Đưa ${label} xuống`}
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDown />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Xóa ${label}`} className="text-destructive" onClick={onRemove}>
        <Trash2 />
      </Button>
    </div>
  );
}
