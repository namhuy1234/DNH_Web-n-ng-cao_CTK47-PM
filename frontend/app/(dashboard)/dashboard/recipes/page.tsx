import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilePlus2 } from "lucide-react";
import { LoadingState } from "@/components/common/Loading";
import { ManageRecipes } from "@/components/dashboard/ManageRecipes";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

// Nội dung phụ thuộc trạng thái đăng nhập ở trình duyệt nên không dựng sẵn App Shell.
export const instant = false;

export const metadata: Metadata = { title: "Quản lý công thức" };

export default function MyRecipesPage() {
  return (
    <>
      <PageHeader
        title="Quản lý công thức"
        description="Bản nháp, bài đã đăng, bài lưu trữ và bài đã xóa (có thể khôi phục)."
        actions={
          <Button asChild>
            <Link href="/dashboard/recipes/new">
              <FilePlus2 /> Viết công thức
            </Link>
          </Button>
        }
      />
      {/* Bộ lọc đọc từ URL (useSearchParams) nên cần Suspense. */}
      <Suspense fallback={<LoadingState />}>
        <ManageRecipes />
      </Suspense>
    </>
  );
}
