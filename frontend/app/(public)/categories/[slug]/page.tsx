import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategorySidebar, CategorySidebarSkeleton } from "@/components/category/CategorySidebar";
import { RecipeGridSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecipeResults } from "@/components/recipe/RecipeResults";
import { getCategory } from "@/lib/api/public";
import { RECIPES_PAGE_SIZE } from "@/lib/constants";
import { parsePage } from "@/lib/pagination";

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const detail = await getCategory((await params).slug).catch(() => null);
  return detail
    ? { title: detail.category.name, description: detail.category.description ?? undefined }
    : { title: "Không tìm thấy danh mục" };
}

/*
 * Với Cache Components, Next.js gửi phần khung tĩnh (mã 200) trước rồi mới chạy phần đọc dữ liệu,
 * nên notFound() không đổi được mã trạng thái; nó vẫn hiện trang 404 và tự thêm
 * <meta name="robots" content="noindex"> để máy tìm kiếm không lưu trang (tài liệu not-found.md).
 */
export default function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  return (
    <div className="container mx-auto grid gap-8 px-4 py-10 lg:grid-cols-[260px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Suspense fallback={<CategorySidebarSkeleton />}>
          <ActiveSidebar params={params} />
        </Suspense>
      </aside>
      <section>
        <Suspense fallback={<RecipeGridSkeleton count={6} />}>
          <CategoryRecipes params={params} searchParams={searchParams} />
        </Suspense>
      </section>
    </div>
  );
}

async function ActiveSidebar({ params }: Pick<PageProps<"/categories/[slug]">, "params">) {
  return <CategorySidebar activeSlug={(await params).slug} />;
}

async function CategoryRecipes({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const detail = await getCategory(slug, parsePage(query.page), RECIPES_PAGE_SIZE);
  if (!detail) notFound();

  return (
    <>
      <PageHeader
        title={detail.category.name}
        description={detail.category.description ?? `Các công thức thuộc danh mục ${detail.category.name}.`}
      />
      <RecipeResults
        result={detail.recipes}
        basePath={`/categories/${slug}`}
        columns={3}
        emptyTitle="Danh mục chưa có công thức"
        emptyDescription="Hãy là người đầu tiên chia sẻ món ăn thuộc danh mục này."
      />
    </>
  );
}
