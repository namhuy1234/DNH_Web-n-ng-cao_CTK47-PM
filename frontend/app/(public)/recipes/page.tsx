import type { Metadata } from "next";
import { Suspense } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { RecipeGridSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecipeFilters } from "@/components/recipe/RecipeFilters";
import { RecipeResults } from "@/components/recipe/RecipeResults";
import { ViewModeToggle } from "@/components/recipe/RecipeCollection";
import { getCategories } from "@/lib/api/categories";
import { getRecipes } from "@/lib/api/public";
import { getErrorMessage } from "@/lib/api/errors";
import { RECIPES_PAGE_SIZE } from "@/lib/constants";
import { load } from "@/lib/load";
import { filterQuery, parseRecipeFilters } from "@/lib/recipe-search";

export const metadata: Metadata = { title: "Công thức" };

export default function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  return (
    <div className="container mx-auto px-4 py-10">
      <PageHeader title="Công thức nấu ăn" description="Lọc theo danh mục, độ khó và sắp xếp theo ý bạn." actions={<ViewModeToggle />} />
      {/* searchParams là dữ liệu runtime nên phần đọc nó phải nằm trong Suspense */}
      <Suspense fallback={<RecipeGridSkeleton />}>
        <RecipeList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RecipeList({ searchParams }: Pick<PageProps<"/recipes">, "searchParams">) {
  const filters = parseRecipeFilters(await searchParams);
  const [data, error] = await load(() =>
    Promise.all([
      getCategories(),
      getRecipes({
        page: filters.page,
        pageSize: RECIPES_PAGE_SIZE,
        categoryId: filters.categoryId,
        difficulty: filters.difficulty,
        sort: filters.sort,
      }),
    ]),
  );
  if (!data) return <ErrorState title="Không tải được công thức" message={getErrorMessage(error)} />;
  const [categories, result] = data;

  return (
    <>
      <RecipeFilters key={JSON.stringify(filters)} action="/recipes" categories={categories} initial={filters} showSort />
      <RecipeResults result={result} basePath="/recipes" searchParams={filterQuery(filters, ["categoryId", "difficulty", "sort"])} />
    </>
  );
}
