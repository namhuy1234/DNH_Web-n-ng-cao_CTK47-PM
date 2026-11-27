import Link from "next/link";
import { ChevronRight, Clock, Flame, Timer, Users } from "lucide-react";
import { DifficultyBadge, RecipeCover } from "@/components/recipe/RecipeCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDuration } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import type { IngredientDto, NutritionDto, RecipeDetailDto } from "@/types";

/** "200 g", "1,5 muỗng canh"; số lẻ hiển thị theo kiểu Việt Nam. */
export function formatQuantity({ quantity, unit }: Pick<IngredientDto, "quantity" | "unit">) {
  const amount = quantity === null ? "" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(quantity);
  return [amount, unit ?? ""].filter(Boolean).join(" ");
}

const NUTRITION_ROWS: { key: keyof NutritionDto; label: string; unit: string }[] = [
  { key: "calories", label: "Năng lượng", unit: "kcal" },
  { key: "protein", label: "Chất đạm", unit: "g" },
  { key: "carbohydrates", label: "Tinh bột", unit: "g" },
  { key: "fat", label: "Chất béo", unit: "g" },
  { key: "fiber", label: "Chất xơ", unit: "g" },
  { key: "sodium", label: "Natri", unit: "mg" },
];

/** Server Component: toàn bộ nội dung trang chi tiết công thức. */
export function RecipeDetail({ recipe }: { recipe: RecipeDetailDto }) {
  const primary = recipe.images.find((i) => i.isPrimary) ?? recipe.images[0];
  const gallery = recipe.images.filter((i) => i !== primary && mediaUrl(i.originalUrl));
  const ingredients = [...recipe.ingredients].sort((a, b) => a.orderIndex - b.orderIndex);
  const steps = [...recipe.steps].sort((a, b) => a.stepNumber - b.stepNumber);
  const nutrition = recipe.nutrition
    ? NUTRITION_ROWS.filter((row) => recipe.nutrition![row.key] !== null)
    : [];

  const meta = [
    { icon: Clock, label: "Chuẩn bị", value: formatDuration(recipe.prepTime) },
    { icon: Flame, label: "Nấu", value: formatDuration(recipe.cookTime) },
    { icon: Timer, label: "Tổng thời gian", value: formatDuration(recipe.prepTime + recipe.cookTime) },
    { icon: Users, label: "Khẩu phần", value: `${recipe.servings} người` },
  ];

  return (
    <article className="space-y-8">
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/categories/${recipe.categorySlug}`} className="hover:text-primary">
          {recipe.categoryName}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate text-foreground" aria-current="page">
          {recipe.title}
        </span>
      </nav>

      <header className="grid gap-6 lg:grid-cols-2 lg:items-center">
        <RecipeCover
          recipe={{ title: primary?.altText ?? recipe.title, primaryImageUrl: primary?.originalUrl ?? null }}
          className="aspect-video w-full rounded-2xl"
        />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" asChild>
              <Link href={`/categories/${recipe.categorySlug}`}>{recipe.categoryName}</Link>
            </Badge>
            <DifficultyBadge difficulty={recipe.difficulty} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{recipe.title}</h1>
          <p className="text-lg text-muted-foreground">{recipe.description}</p>
          <p className="text-sm text-muted-foreground">
            Đăng bởi <span className="font-medium text-foreground">{recipe.authorName}</span>
            {recipe.publishedAt && <> ngày {formatDate(recipe.publishedAt)}</>}
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {meta.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-center">
                <Icon className="size-5 text-primary" aria-hidden />
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Nguyên liệu ({ingredients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {ingredients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tác giả chưa nhập nguyên liệu.</p>
              ) : (
                <ul className="text-sm">
                  {ingredients.map((item, i) => (
                    <li key={item.id}>
                      {i > 0 && <Separator className="my-2" />}
                      <div className="flex justify-between gap-4">
                        <span>
                          {item.name}
                          {item.notes && <span className="block text-xs text-muted-foreground">{item.notes}</span>}
                        </span>
                        <span className="shrink-0 font-medium">{formatQuantity(item)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {nutrition.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Dinh dưỡng (mỗi phần)</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {nutrition.map((row) => (
                    <div key={row.key} className="contents">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="text-right font-medium">
                        {new Intl.NumberFormat("vi-VN").format(recipe.nutrition![row.key]!)} {row.unit}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </aside>

        <section aria-labelledby="steps-heading" className="space-y-6">
          <h2 id="steps-heading" className="text-2xl font-bold">
            Cách làm
          </h2>
          {steps.length > 0 ? (
            <ol className="space-y-6">
              {steps.map((step) => {
                const image = mediaUrl(step.imageUrl);
                return (
                  <li key={step.id} className="flex gap-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                      {step.stepNumber}
                    </span>
                    <div className="space-y-2">
                      <h3 className="font-semibold">
                        {step.title}
                        {step.timerMinutes ? (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                            <Timer className="size-3" /> {formatDuration(step.timerMinutes)}
                          </span>
                        ) : null}
                      </h3>
                      <p className="whitespace-pre-line text-muted-foreground">{step.description}</p>
                      {image && (
                        // eslint-disable-next-line @next/next/no-img-element -- ảnh từ backend
                        <img src={image} alt={step.title} loading="lazy" className="max-h-72 rounded-xl object-cover" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="whitespace-pre-line text-muted-foreground">{recipe.instructions || "Tác giả chưa nhập các bước."}</p>
          )}

          {gallery.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Hình ảnh</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh từ backend
                  <img
                    key={image.id}
                    src={mediaUrl(image.originalUrl)!}
                    alt={image.altText ?? recipe.title}
                    loading="lazy"
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
