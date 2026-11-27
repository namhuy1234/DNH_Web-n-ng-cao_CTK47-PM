import type { Metadata } from "next";
import { Suspense } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { RecipeGridSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecipeFilters } from "@/components/recipe/RecipeFilters";
import { RecipeResults } from "@/components/recipe/RecipeResults";
import { getCategories } from "@/lib/api/categories";
import { getRecipes, searchRecipes } from "@/lib/api/public";
import { getErrorMessage } from "@/lib/api/errors";
import { RECIPES_PAGE_SIZE } from "@/lib/constants";
import { load } from "@/lib/load";
import { filterQuery, parseRecipeFilters } from "@/lib/recipe-search";

export const metadata: Metadata = { title: "Tìm kiếm" };

export default function SearchPage({ searchParams }: PageProps<"/recipes/search">) {
  return (
    <div className="container mx-auto px-4 py-10">
      <PageHeader
        title="Tìm kiếm công thức"
        description="Tìm theo tên món, mô tả hoặc nguyên liệu; gõ không dấu cũng được (ví dụ: pho bo)."
      />
      <Suspense fallback={<RecipeGridSkeleton count={4} />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchResults({ searchParams }: Pick<PageProps<"/recipes/search">, "searchParams">) {
  const filters = parseRecipeFilters(await searchParams);
  const hasCriteria = Boolean(filters.q || filters.categoryId || filters.difficulty);

  const [data, error] = await load(() =>
    Promise.all([
      getCategories(),
      // API tìm kiếm bắt buộc có từ khóa (422 nếu thiếu q); chỉ chọn bộ lọc thì dùng danh sách có lọc.
      !hasCriteria
        ? null
        : filters.q
          ? searchRecipes({
              q: filters.q,
              categoryId: filters.categoryId,
              difficulty: filters.difficulty,
              page: filters.page,
              pageSize: RECIPES_PAGE_SIZE,
            })
          : getRecipes({
              categoryId: filters.categoryId,
              difficulty: filters.difficulty,
              page: filters.page,
              pageSize: RECIPES_PAGE_SIZE,
            }),
    ]),
  );
  if (!data) return <ErrorState title="Không tìm kiếm được" message={getErrorMessage(error)} />;
  const [categories, result] = data;
  const label = filters.q ? `"${filters.q}"` : "bộ lọc đã chọn";

  return (
    <>
      {/* key buộc tạo lại thanh lọc khi URL đổi (ví dụ bấm Back) để giá trị không bị cũ. */}
      <RecipeFilters key={JSON.stringify(filters)} action="/recipes/search" categories={categories} initial={filters} showKeyword />
      {result ? (
        <RecipeResults
          result={result}
          basePath="/recipes/search"
          searchParams={filterQuery(filters, ["q", "categoryId", "difficulty"])}
          summary={`Tìm thấy ${result.totalCount} kết quả cho ${label}`}
          emptyTitle={`Không tìm thấy kết quả cho ${label}`}
          emptyDescription="Thử từ khóa ngắn hơn, kiểm tra chính tả hoặc bỏ bớt bộ lọc."
        />
      ) : (
        <EmptyState title="Nhập từ khóa hoặc chọn bộ lọc để tìm" description="Ví dụ: phở, gà, chè, bánh xèo..." />
      )}
    </>
  );
}
