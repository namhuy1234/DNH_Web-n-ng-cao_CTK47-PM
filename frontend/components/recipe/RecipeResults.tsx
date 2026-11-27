import Link from "next/link";
import { SearchX } from "lucide-react";
import { AppPagination } from "@/components/common/AppPagination";
import { EmptyState } from "@/components/common/EmptyState";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { RecipeCollection } from "@/components/recipe/RecipeCollection";
import { Button } from "@/components/ui/button";
import type { PagedResult, RecipeSummaryDto } from "@/types";

interface RecipeResultsProps {
  result: PagedResult<RecipeSummaryDto>;
  basePath: string;
  /** Tham số lọc giữ lại khi chuyển trang. */
  searchParams?: Record<string, string | undefined>;
  summary?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Trang có sidebar dùng 3 cột cho thẻ đủ rộng. */
  columns?: 3 | 4;
}

/** Danh sách thẻ công thức + dòng tóm tắt + phân trang, dùng chung cho mọi trang danh sách. */
export function RecipeResults({
  result,
  basePath,
  searchParams,
  summary,
  emptyTitle = "Chưa có công thức nào",
  emptyDescription = "Thử bỏ bớt bộ lọc hoặc quay lại sau nhé.",
  columns = 4,
}: RecipeResultsProps) {
  if (result.items.length === 0) {
    // Trang vượt quá số trang (ví dụ ?page=999 hoặc dữ liệu vừa bị xóa bớt): chỉ đường về trang cuối.
    if (result.totalPages > 0 && result.page > result.totalPages) {
      const params = new URLSearchParams(
        Object.entries(searchParams ?? {}).filter((entry): entry is [string, string] => !!entry[1] && entry[0] !== "page"),
      );
      if (result.totalPages > 1) params.set("page", String(result.totalPages));
      const query = params.toString();
      return (
        <EmptyState
          icon={SearchX}
          title={`Không có trang ${result.page}`}
          description={`Danh sách chỉ có ${result.totalPages} trang.`}
          action={
            <Button asChild>
              <Link href={query ? `${basePath}?${query}` : basePath}>Về trang {result.totalPages}</Link>
            </Button>
          }
        />
      );
    }
    return <EmptyState icon={SearchX} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
        {summary ?? `${result.totalCount} công thức`} — trang {result.page}/{result.totalPages}
      </p>
      <RecipeCollection columns={columns}>
        {result.items.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </RecipeCollection>
      <AppPagination page={result.page} totalPages={result.totalPages} basePath={basePath} searchParams={searchParams} />
    </>
  );
}
