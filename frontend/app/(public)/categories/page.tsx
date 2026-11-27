import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryList, CategoryListSkeleton } from "@/components/category/CategoryList";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Danh mục" };

export default function CategoriesPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <PageHeader title="Danh mục món ăn" description="Chọn nhóm món để xem các công thức liên quan." />
      <Suspense fallback={<CategoryListSkeleton count={12} />}>
        <CategoryList />
      </Suspense>
    </div>
  );
}
