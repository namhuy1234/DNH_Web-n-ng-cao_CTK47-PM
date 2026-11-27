import { connection } from "next/server";
import { getCategories } from "@/lib/api/categories";
import type { CategoryDto } from "@/types";

/** Server Component: chạy lúc có request, dữ liệu lấy qua cache. */
export async function CategoryList() {
  await connection();

  let categories: CategoryDto[] | null;
  try {
    categories = await getCategories();
  } catch {
    categories = null;
  }

  if (!categories) {
    return <p className="text-red-600">Không kết nối được API. Hãy chạy backend ở cổng 5000.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {categories.map((category) => (
        <li key={category.id} className="rounded-lg border border-gray-200 px-3 py-2">
          <span className="font-medium">{category.name}</span>
          <span className="text-sm text-gray-500"> ({category.recipeCount})</span>
        </li>
      ))}
    </ul>
  );
}
