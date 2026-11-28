import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { RecipeDetail } from "@/components/recipe/RecipeDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategory, getRecipe } from "@/lib/api/public";

export async function generateMetadata({ params }: PageProps<"/recipes/[slug]">): Promise<Metadata> {
  const recipe = await getRecipe((await params).slug).catch(() => null);
  if (!recipe) return { title: "Không tìm thấy công thức" };
  return {
    title: recipe.title,
    description: recipe.description,
    openGraph: { type: "article", title: recipe.title, description: recipe.description },
  };
}

/*
 * Với Cache Components, Next.js gửi phần khung tĩnh (mã 200) trước rồi mới chạy phần đọc dữ liệu,
 * nên notFound() không đổi được mã trạng thái; nó vẫn hiện trang 404 và tự thêm
 * <meta name="robots" content="noindex"> để máy tìm kiếm không lưu trang (tài liệu not-found.md).
 */
export default function RecipeDetailPage({ params }: PageProps<"/recipes/[slug]">) {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<DetailSkeleton />}>
        <RecipeContent params={params} />
      </Suspense>
    </div>
  );
}

async function RecipeContent({ params }: Pick<PageProps<"/recipes/[slug]">, "params">) {
  const { slug } = await params;
  // Không có, đã xóa (API trả 404) hoặc chưa công khai: bản nháp, lưu trữ (API trả 403) -> trang 404.
  const recipe = await getRecipe(slug);
  if (!recipe) notFound();

  return (
    <>
      <RecipeDetail recipe={recipe} />
      {/* Món cùng danh mục không quan trọng bằng nội dung chính: stream sau. */}
      <Suspense fallback={<Skeleton className="mt-12 h-64 w-full" />}>
        <RelatedRecipes categorySlug={recipe.categorySlug} currentId={recipe.id} />
      </Suspense>
    </>
  );
}

/** Công thức cùng danh mục (không gồm món đang xem). Lỗi ở đây không làm hỏng trang. */
async function RelatedRecipes({ categorySlug, currentId }: { categorySlug: string; currentId: string }) {
  const detail = await getCategory(categorySlug, 1, 5).catch(() => null);
  const related = detail?.recipes.items.filter((r) => r.id !== currentId).slice(0, 4) ?? [];
  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="mt-12 border-t pt-8">
      <h2 id="related-heading" className="mb-6 text-2xl font-bold">
        Cùng danh mục {detail!.category.name}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải công thức">
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
