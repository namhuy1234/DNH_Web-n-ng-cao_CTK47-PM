"use server";

import { updateTag } from "next/cache";

const API_URL = process.env.API_URL ?? "http://localhost:5000";

/**
 * Xóa cache trang công khai (danh sách, chi tiết, danh mục) ngay sau khi tác giả sửa bài,
 * để người viết thấy thay đổi của mình (read-your-own-writes).
 *
 * Server Action là một endpoint ai cũng gọi được, nên chỉ chạy khi access token còn hợp lệ:
 * hỏi lại backend qua /auth/me thay vì tin vào trình duyệt.
 */
export async function refreshPublicCache(accessToken: string | null): Promise<boolean> {
  if (!accessToken) return false;

  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!response?.ok) return false;

  updateTag("recipes");
  updateTag("categories");
  return true;
}
