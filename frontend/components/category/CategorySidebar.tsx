import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategories } from "@/lib/api/categories";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { CategoryDto } from "@/types";

/** Sidebar danh mục (Server Component, dữ liệu cache vài phút). */
export async function CategorySidebar({ activeSlug }: { activeSlug?: string }) {
  let categories: CategoryDto[];
  try {
    categories = await getCategories();
  } catch (error) {
    return <ErrorState title="Không tải được danh mục" message={getErrorMessage(error)} className="text-sm" />;
  }

  return (
    <nav aria-label="Danh mục món ăn" className="rounded-xl border bg-card p-3">
      <h2 className="mb-2 flex items-center gap-2 px-2 text-sm font-semibold">
        <LayoutGrid className="size-4 text-primary" /> Danh mục
      </h2>
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {categories.map((category) => {
          const active = category.slug === activeSlug;
          return (
            <li key={category.id} className="shrink-0">
              <Link
                href={`/categories/${category.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  active && "bg-accent font-medium text-accent-foreground",
                )}
              >
                <span className="truncate">{category.name}</span>
                <span className="rounded-full bg-muted px-2 text-xs tabular-nums">{category.recipeCount}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/categories" className="mt-2 block px-2 text-sm font-medium text-primary hover:underline">
        Xem tất cả danh mục →
      </Link>
    </nav>
  );
}

export function CategorySidebarSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-3" role="status" aria-label="Đang tải danh mục">
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="h-7 w-full" />
      ))}
    </div>
  );
}
