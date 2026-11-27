import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { RecipeGridSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { RecipeFilters } from "@/components/recipe/RecipeFilters";
import { MOCK_RECIPES } from "@/lib/mock-data";
import { filterRecipes, parseRecipeFilters } from "@/lib/recipe-search";

export const metadata: Metadata = { title: "Tìm kiếm" };

export default function SearchPage({ searchParams }: PageProps<"/recipes/search">) {
  return (
    <div className="container mx-auto px-4 py-10">
      <PageHeader title="Tìm kiếm công thức" description="Tìm theo tên hoặc mô tả món ăn, có thể gõ không dấu." />
      <Suspense fallback={<RecipeGridSkeleton count={4} />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchResults({ searchParams }: Pick<PageProps<"/recipes/search">, "searchParams">) {
  const filters = parseRecipeFilters(await searchParams);
  // Thanh lọc nằm trong phần đọc URL để giữ lại từ khóa và lựa chọn sau khi tìm.
  // key buộc tạo lại thanh lọc khi URL đổi (ví dụ bấm Back) để giá trị không bị cũ.
  const toolbar = <RecipeFilters key={JSON.stringify(filters)} initial={filters} />;

  if (!filters.q && !filters.difficulty) {
    return (
      <>
        {toolbar}
        <EmptyState title="Nhập từ khóa hoặc chọn độ khó để tìm" description="Ví dụ: phở, bún, chè, bánh..." />
      </>
    );
  }

  // Lab 6: lọc trên dữ liệu mẫu. Lab 7 thay bằng recipesApi.search(...).
  const results = filterRecipes(MOCK_RECIPES, filters);
  const label = filters.q ? `"${filters.q}"` : "bộ lọc đã chọn";

  return (
    <>
      {toolbar}
      {results.length === 0 ? (
        <EmptyState icon={SearchX} title={`Không tìm thấy kết quả cho ${label}`} description="Thử từ khóa ngắn hơn hoặc bỏ bớt bộ lọc." />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Tìm thấy {results.length} kết quả cho {label}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
