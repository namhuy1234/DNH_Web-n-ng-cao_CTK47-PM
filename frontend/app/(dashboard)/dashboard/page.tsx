import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, FilePen, FilePlus2, Archive } from "lucide-react";
import { RecipeTable } from "@/components/dashboard/RecipeTable";
import { WelcomeTitle } from "@/components/dashboard/WelcomeTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_RECIPES } from "@/lib/mock-data";

// Nội dung bị RequireAuth (kiểm tra ở trình duyệt) giữ lại tới khi biết trạng thái đăng nhập,
// nên không thể dựng sẵn App Shell để chuyển trang tức thì. Lab 7 chuyển sang proxy.ts.
export const instant = false;

export const metadata: Metadata = { title: "Trang quản lý" };

export default function DashboardPage() {
  const count = (status: string) => MOCK_RECIPES.filter((r) => r.status === status).length;
  const stats = [
    { label: "Tổng công thức", value: MOCK_RECIPES.length, icon: BookOpenCheck },
    { label: "Đã đăng", value: count("Published"), icon: BookOpenCheck },
    { label: "Bản nháp", value: count("Draft"), icon: FilePen },
    { label: "Lưu trữ", value: count("Archived"), icon: Archive },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <WelcomeTitle />
          </h1>
          <p className="text-muted-foreground">Tổng quan các công thức của bạn (số liệu mẫu).</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/recipes/new">
            <FilePlus2 /> Viết công thức
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="gap-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{label}</CardDescription>
                <Icon className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section>
        <CardTitle className="mb-4 text-lg">Công thức gần đây</CardTitle>
        <RecipeTable recipes={MOCK_RECIPES.slice(0, 5)} />
      </section>
    </div>
  );
}
