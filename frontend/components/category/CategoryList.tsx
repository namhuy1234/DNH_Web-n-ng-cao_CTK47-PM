import Link from "next/link";
import { connection } from "next/server";
import { LayoutGrid } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategories } from "@/lib/api/categories";
import { getErrorMessage } from "@/lib/api/errors";
import type { CategoryDto } from "@/types";

/** Server Component: chạy lúc có request, dữ liệu lấy qua cache. */
export async function CategoryList({ limit }: { limit?: number }) {
  await connection();

  let categories: CategoryDto[];
  try {
    categories = await getCategories();
  } catch (error) {
    return <ErrorState title="Không tải được danh mục" message={`${getErrorMessage(error)} Hãy chạy backend ở cổng 5000.`} />;
  }

  if (categories.length === 0) {
    return <EmptyState icon={LayoutGrid} title="Chưa có danh mục" description="Quản trị viên chưa tạo danh mục nào." />;
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {categories.slice(0, limit).map((category) => (
        <li key={category.id}>
          <Link
            href="/recipes"
            className="flex h-full flex-col gap-1 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
          >
            <span className="font-semibold">{category.name}</span>
            <span className="text-sm text-muted-foreground">{category.recipeCount} công thức</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CategoryListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-label="Đang tải danh mục">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[74px] rounded-xl" />
      ))}
    </div>
  );
}
