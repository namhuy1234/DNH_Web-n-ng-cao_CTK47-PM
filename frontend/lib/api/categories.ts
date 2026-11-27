import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { apiGet } from "./server";
import type { CategoryDto } from "@/types";

/**
 * Danh mục ít thay đổi nên được cache vài phút. Mọi lượt xem dùng chung kết quả,
 * server Next.js không gọi API liên tục (tránh đụng rate limit theo IP).
 * Lỗi được ném ra ngoài nên không bị cache.
 */
export async function getCategories() {
  "use cache";
  cacheLife("minutes");
  cacheTag("categories");

  const categories = await apiGet<CategoryDto[]>("/categories");
  return categories ?? [];
}
