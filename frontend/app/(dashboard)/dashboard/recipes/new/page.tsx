import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/common/Loading";
import { RecipeForm } from "@/components/dashboard/recipe-editor/RecipeForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCategories } from "@/lib/api/categories";

// Nội dung phụ thuộc trạng thái đăng nhập ở trình duyệt nên không dựng sẵn App Shell.
export const instant = false;

export const metadata: Metadata = { title: "Viết công thức" };

export default function NewRecipePage() {
  return (
    <>
      <PageHeader
        title="Viết công thức mới"
        description="Điền thông tin, nguyên liệu và các bước. Lưu nháp xong bạn sẽ được chuyển sang trang thêm ảnh."
      />
      <Suspense fallback={<LoadingState text="Đang tải danh mục..." />}>
        <NewRecipeForm />
      </Suspense>
    </>
  );
}

async function NewRecipeForm() {
  return <RecipeForm categories={await getCategories()} />;
}
