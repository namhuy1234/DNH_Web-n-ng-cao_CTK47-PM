import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { LoadingState } from "@/components/common/Loading";
import { RecipeEditor } from "@/components/dashboard/recipe-editor/RecipeEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { getCategories } from "@/lib/api/categories";

// Nội dung phụ thuộc trạng thái đăng nhập ở trình duyệt nên không dựng sẵn App Shell.
export const instant = false;

export const metadata: Metadata = { title: "Sửa công thức" };

export default function EditRecipePage({ params }: PageProps<"/dashboard/recipes/[id]/edit">) {
  return (
    <>
      <PageHeader
        title="Sửa công thức"
        description="Ảnh được lưu ngay khi tải lên; các phần khác lưu bằng nút Lưu thay đổi."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/recipes">
              <ArrowLeft /> Danh sách
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<LoadingState text="Đang tải công thức..." />}>
        <EditContent params={params} />
      </Suspense>
    </>
  );
}

async function EditContent({ params }: Pick<PageProps<"/dashboard/recipes/[id]/edit">, "params">) {
  // Lấy danh mục lúc mở trang, không lúc build (khi build không có API).
  await connection();
  const [{ id }, categories] = await Promise.all([params, getCategories()]);
  return <RecipeEditor id={id} categories={categories} />;
}
