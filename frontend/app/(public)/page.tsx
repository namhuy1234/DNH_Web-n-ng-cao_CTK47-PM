import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight, Search } from "lucide-react";
import { CategorySidebar, CategorySidebarSkeleton } from "@/components/category/CategorySidebar";
import { ErrorState } from "@/components/common/ErrorState";
import { RecipeGridSkeleton } from "@/components/common/Loading";
import { RecipeResults } from "@/components/recipe/RecipeResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRecipes } from "@/lib/api/public";
import { getErrorMessage } from "@/lib/api/errors";
import { load } from "@/lib/load";
import { parsePage } from "@/lib/pagination";

const HOME_PAGE_SIZE = 9;

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="border-b bg-gradient-to-br from-orange-50 via-amber-50 to-background dark:from-orange-950/30 dark:via-background">
        <div className="container mx-auto space-y-5 px-4 py-12 md:py-16">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Ẩm thực Việt mỗi ngày</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Nấu ngon hơn với những công thức được chia sẻ từ bếp nhà
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Khám phá công thức theo danh mục, tìm món theo tên hoặc nguyên liệu và chia sẻ bí quyết của bạn.
          </p>
          <form action="/recipes/search" role="search" className="flex max-w-lg gap-2">
            <Input name="q" type="search" placeholder="Tìm món: phở, bún chả, chè..." className="h-10 bg-background" aria-label="Từ khóa" />
            <Button type="submit" size="lg" className="h-10">
              <Search /> Tìm
            </Button>
          </form>
        </div>
      </section>

      <div className="container mx-auto grid gap-8 px-4 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Suspense fallback={<CategorySidebarSkeleton />}>
            <SidebarData />
          </Suspense>
        </aside>

        <section aria-labelledby="latest-heading">
          <div className="mb-6 flex items-end justify-between">
            <h2 id="latest-heading" className="text-2xl font-bold tracking-tight">
              Công thức mới
            </h2>
            <Button asChild variant="link" className="px-0">
              <Link href="/recipes">
                Xem tất cả <ArrowRight />
              </Link>
            </Button>
          </div>
          <Suspense fallback={<RecipeGridSkeleton count={HOME_PAGE_SIZE} />}>
            <LatestRecipes searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </>
  );
}

async function SidebarData() {
  // Lấy dữ liệu lúc có request (không gọi API khi build), kết quả vẫn được cache.
  await connection();
  return <CategorySidebar />;
}

async function LatestRecipes({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const page = parsePage((await searchParams).page);
  const [result, error] = await load(() => getRecipes({ page, pageSize: HOME_PAGE_SIZE, sort: "-createdAt" }));
  if (!result) return <ErrorState title="Không tải được công thức" message={getErrorMessage(error)} />;

  return <RecipeResults result={result} basePath="/" columns={3} summary={`${result.totalCount} công thức đã đăng`} />;
}
