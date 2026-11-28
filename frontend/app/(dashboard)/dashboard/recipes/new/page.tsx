import type { Metadata } from "next";
import { connection } from "next/server";
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
  // Lấy danh mục lúc người dùng mở trang, không dựng sẵn lúc build:
  // khi build (ví dụ trên CI) không có API nên dựng sẵn sẽ làm hỏng bản build.
  await connection();
  return <RecipeForm categories={await getCategories()} />;
}
