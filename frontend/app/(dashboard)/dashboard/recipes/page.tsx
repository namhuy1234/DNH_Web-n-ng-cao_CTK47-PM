import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { RecipeTable } from "@/components/dashboard/RecipeTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { MOCK_RECIPES } from "@/lib/mock-data";

// Nội dung bị RequireAuth (kiểm tra ở trình duyệt) giữ lại tới khi biết trạng thái đăng nhập,
// nên không thể dựng sẵn App Shell để chuyển trang tức thì. Lab 7 chuyển sang proxy.ts.
export const instant = false;

export const metadata: Metadata = { title: "Công thức của tôi" };

export default function MyRecipesPage() {
  return (
    <>
      <PageHeader
        title="Công thức của tôi"
        description="Quản lý bản nháp, bài đã đăng và bài lưu trữ."
        actions={
          <Button asChild>
            <Link href="/dashboard/recipes/new">
              <FilePlus2 /> Viết công thức
            </Link>
          </Button>
        }
      />
      <RecipeTable recipes={MOCK_RECIPES} />
    </>
  );
}
