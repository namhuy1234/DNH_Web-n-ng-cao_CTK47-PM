import Link from "next/link";
import { Clock, CookingPot, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DIFFICULTY_LABELS, formatDuration } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { RecipeDifficulty, RecipeSummaryDto } from "@/types";

const DIFFICULTY_STYLES: Record<RecipeDifficulty, string> = {
  Easy: "bg-emerald-100 text-emerald-800",
  Medium: "bg-amber-100 text-amber-800",
  Hard: "bg-rose-100 text-rose-800",
  Expert: "bg-violet-100 text-violet-800",
};

export function DifficultyBadge({ difficulty }: { difficulty: RecipeDifficulty }) {
  return (
    <Badge variant="secondary" className={DIFFICULTY_STYLES[difficulty]}>
      {DIFFICULTY_LABELS[difficulty]}
    </Badge>
  );
}

/** Ảnh đại diện; chưa có ảnh thì hiện nền chuyển màu và biểu tượng nồi. */
export function RecipeCover({
  recipe,
  className,
}: {
  recipe: Pick<RecipeSummaryDto, "title" | "primaryImageUrl">;
  className?: string;
}) {
  const src = mediaUrl(recipe.primaryImageUrl);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- ảnh từ backend, Lab 8 chuyển sang next/image
    return <img data-cover src={src} alt={recipe.title} loading="lazy" className={cn("object-cover", className)} />;
  }
  return (
    <div data-cover className={cn("flex items-center justify-center bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100 dark:from-orange-950/60 dark:via-stone-900 dark:to-rose-950/50", className)}>
      <CookingPot className="size-12 text-primary/60" aria-hidden />
    </div>
  );
}

/** Server Component: thẻ công thức dạng lưới hoặc dạng dòng. */
export function RecipeCard({ recipe, layout = "grid" }: { recipe: RecipeSummaryDto; layout?: "grid" | "list" }) {
  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <Card
      className={cn(
        "group relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md",
        layout === "list" && "sm:flex-row",
      )}
    >
      <RecipeCover
        recipe={recipe}
        className={cn("aspect-[4/3] w-full", layout === "list" && "sm:aspect-auto sm:w-56 sm:shrink-0")}
      />
      <div className="flex flex-1 flex-col">
        <CardHeader className="gap-2 pt-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{recipe.categoryName}</Badge>
            <DifficultyBadge difficulty={recipe.difficulty} />
          </div>
          <CardTitle className="text-base leading-snug">
            <Link href={`/recipes/${recipe.slug}`} className="after:absolute after:inset-0 group-hover:text-primary">
              {recipe.title}
            </Link>
          </CardTitle>
          <CardDescription className="line-clamp-2">{recipe.description}</CardDescription>
          <p className="truncate text-xs text-muted-foreground">bởi {recipe.authorName}</p>
        </CardHeader>
        <CardFooter className="mt-auto flex-wrap gap-x-4 gap-y-1 py-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {formatDuration(totalTime)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" /> {recipe.servings} người
          </span>
        </CardFooter>
      </div>
    </Card>
  );
}
