import type { Metadata } from "next";
import { Suspense } from "react";
import { AppPagination } from "@/components/common/AppPagination";
import { EmptyState } from "@/components/common/EmptyState";
import { RecipeGridSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { RecipeCollection, ViewModeToggle } from "@/components/recipe/RecipeCollection";
import { RecipeFilters } from "@/components/recipe/RecipeFilters";
import { RECIPES_PAGE_SIZE } from "@/lib/constants";
import { getMockRecipePage } from "@/lib/mock-data";
import { parsePage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Công thức" };

export default function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  return (
    <div className="container mx-auto px-4 py-10">
      <PageHeader
        title="Công thức nấu ăn"
        description="Những món ngon được cộng đồng chia sẻ mới nhất."
        actions={<ViewModeToggle />}
      />
      <RecipeFilters />
      {/* searchParams là dữ liệu runtime nên phần đọc nó phải nằm trong Suspense */}
      <Suspense fallback={<RecipeGridSkeleton />}>
        <RecipeResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RecipeResults({ searchParams }: Pick<PageProps<"/recipes">, "searchParams">) {
  const page = parsePage((await searchParams).page);
  // Lab 6: dữ liệu mẫu. Lab 7 thay bằng recipesApi.list({ page, pageSize }).
  const result = getMockRecipePage(page, RECIPES_PAGE_SIZE);

  if (result.items.length === 0) {
    return <EmptyState title="Chưa có công thức" description="Hãy quay lại sau nhé." />;
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Hiển thị {result.items.length} / {result.totalCount} công thức — trang {result.page}/{result.totalPages}
      </p>
      <RecipeCollection>
        {result.items.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </RecipeCollection>
      <AppPagination page={result.page} totalPages={result.totalPages} basePath="/recipes" />
    </>
  );
}
