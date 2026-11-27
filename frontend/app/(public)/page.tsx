import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Search } from "lucide-react";
import { CategoryList, CategoryListSkeleton } from "@/components/category/CategoryList";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_RECIPES } from "@/lib/mock-data";

export default function HomePage() {
  const featured = MOCK_RECIPES.filter((r) => r.status === "Published").slice(0, 4);

  return (
    <>
      <section className="border-b bg-gradient-to-br from-orange-50 via-amber-50 to-background dark:from-orange-950/30 dark:via-background">
        <div className="container mx-auto grid gap-8 px-4 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">Ẩm thực Việt mỗi ngày</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Nấu ngon hơn với những công thức được chia sẻ từ bếp nhà
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Khám phá hàng trăm món ăn, lưu lại công thức yêu thích và chia sẻ bí quyết nấu nướng của bạn.
            </p>
            <form action="/recipes/search" className="flex max-w-md gap-2">
              <Input name="q" placeholder="Tìm món: phở, bún chả, chè..." className="h-10 bg-background" aria-label="Từ khóa" />
              <Button type="submit" size="lg" className="h-10">
                <Search /> Tìm
              </Button>
            </form>
          </div>
          <div className="hidden grid-cols-2 gap-4 lg:grid">
            {featured.slice(0, 4).map((recipe, i) => (
              <div
                key={recipe.id}
                className={`flex aspect-square flex-col justify-end rounded-2xl p-4 text-sm font-semibold shadow-sm dark:text-stone-900 ${
                  ["bg-orange-200", "bg-amber-100", "bg-rose-100", "bg-emerald-100"][i]
                } ${i % 2 === 1 ? "translate-y-6" : ""}`}
              >
                {recipe.title}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <SectionTitle title="Công thức nổi bật" href="/recipes" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-4">
        <SectionTitle title="Danh mục" href="/categories" />
        {/* Danh mục lấy từ API thật, stream sau khi phần tĩnh đã hiển thị */}
        <Suspense fallback={<CategoryListSkeleton />}>
          <CategoryList />
        </Suspense>
      </section>
    </>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <Button asChild variant="link" className="px-0">
        <Link href={href}>
          Xem tất cả <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
