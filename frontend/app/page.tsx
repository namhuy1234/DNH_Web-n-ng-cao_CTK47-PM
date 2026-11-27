import Link from "next/link";
import { Suspense } from "react";
import { CategoryList } from "@/components/category/CategoryList";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Culinary Blog</h1>
      <p className="mb-6 text-gray-500">Khung dự án frontend của Lab 5.</p>

      <nav className="mb-8 flex flex-wrap gap-4 text-orange-600 underline">
        <Link href="/recipes">Công thức</Link>
        <Link href="/categories">Danh mục</Link>
        <Link href="/login">Đăng nhập</Link>
        <Link href="/register">Đăng ký</Link>
        <Link href="/dashboard">Trang quản lý</Link>
      </nav>

      <h2 className="mb-3 text-xl font-semibold">Danh mục lấy từ API</h2>
      <Suspense fallback={<p>Đang tải...</p>}>
        <CategoryList />
      </Suspense>
    </main>
  );
}
