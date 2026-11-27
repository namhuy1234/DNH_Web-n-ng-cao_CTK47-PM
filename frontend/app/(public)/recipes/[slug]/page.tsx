import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Flame, Users } from "lucide-react";
import { DifficultyBadge, RecipeCover } from "@/components/recipe/RecipeCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDuration } from "@/lib/format";
import { MOCK_RECIPES } from "@/lib/mock-data";

// Nguyên liệu và các bước mẫu dùng chung cho giao diện tĩnh.
const SAMPLE_INGREDIENTS = [
  ["Nguyên liệu chính", "500 g"],
  ["Hành tím", "3 củ"],
  ["Tỏi", "2 tép"],
  ["Nước mắm", "2 muỗng canh"],
  ["Đường", "1 muỗng canh"],
  ["Rau thơm", "1 bó"],
];
const SAMPLE_STEPS = [
  ["Sơ chế", "Rửa sạch nguyên liệu, để ráo. Hành tỏi bóc vỏ, băm nhỏ."],
  ["Ướp", "Ướp nguyên liệu chính với nước mắm, đường và một nửa phần hành tỏi trong 20 phút."],
  ["Nấu", "Phi thơm phần hành tỏi còn lại, cho nguyên liệu vào nấu lửa vừa đến khi chín."],
  ["Hoàn thiện", "Nêm nếm lại cho vừa ăn, rắc rau thơm và dọn ra đĩa."],
];

/** Dựng sẵn trang cho các slug mẫu lúc build. */
export function generateStaticParams() {
  return MOCK_RECIPES.map((recipe) => ({ slug: recipe.slug }));
}

export async function generateMetadata({ params }: PageProps<"/recipes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const recipe = MOCK_RECIPES.find((r) => r.slug === slug);
  return { title: recipe?.title ?? "Không tìm thấy công thức", description: recipe?.description };
}

export default async function RecipeDetailPage({ params }: PageProps<"/recipes/[slug]">) {
  const { slug } = await params;
  const recipe = MOCK_RECIPES.find((r) => r.slug === slug);
  if (!recipe) notFound();

  const meta = [
    { icon: Clock, label: "Chuẩn bị", value: formatDuration(recipe.prepTime) },
    { icon: Flame, label: "Nấu", value: formatDuration(recipe.cookTime) },
    { icon: Users, label: "Khẩu phần", value: `${recipe.servings} người` },
  ];

  return (
    <article className="container mx-auto max-w-5xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/recipes">
          <ChevronLeft /> Tất cả công thức
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <RecipeCover recipe={recipe} className="aspect-video w-full rounded-2xl" />
          <header className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{recipe.categoryName}</Badge>
              <DifficultyBadge difficulty={recipe.difficulty} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{recipe.title}</h1>
            <p className="text-lg text-muted-foreground">{recipe.description}</p>
            <p className="text-sm text-muted-foreground">
              Đăng bởi <span className="font-medium text-foreground">{recipe.authorName}</span> ngày {formatDate(recipe.createdAt)}
            </p>
          </header>

          <dl className="grid grid-cols-3 divide-x rounded-xl border bg-card">
            {meta.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1 p-4 text-center">
                <Icon className="size-5 text-primary" />
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h2 className="mb-4 text-xl font-bold">Cách làm</h2>
            <ol className="space-y-5">
              {SAMPLE_STEPS.map(([title, description], i) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-muted-foreground">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside>
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>Nguyên liệu</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm">
                {SAMPLE_INGREDIENTS.map(([name, amount], i) => (
                  <li key={name}>
                    {i > 0 && <Separator className="my-2" />}
                    <div className="flex justify-between gap-4">
                      <span>{name}</span>
                      <span className="font-medium">{amount}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </article>
  );
}
