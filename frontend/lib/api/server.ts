import "server-only";
import type { ProblemDetails } from "@/types";

// Biến không có tiền tố NEXT_PUBLIC_ chỉ tồn tại trên server.
const API_URL = process.env.API_URL ?? "http://localhost:5000";

export type Query = Record<string, string | number | undefined | null>;

/** Dựng query string, bỏ qua giá trị rỗng. */
export function toQueryString(query: Query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** GET từ phía server; trả null khi 404 hoặc 403, ném lỗi cho các mã khác. */
export async function apiGet<T>(path: string, query?: Query): Promise<T | null> {
  // Giới hạn thời gian chờ để trang không treo khi API không phản hồi.
  const response = await fetch(`${API_URL}/api/v1${path}${toQueryString(query)}`, {
    signal: AbortSignal.timeout(5000),
  });
  // Server gọi API không kèm token (khách). Bài nháp/lưu trữ trả 403 cho khách: với người xem
  // thì cũng là "không có", nên coi như 404 để hiện trang Không tìm thấy thay vì làm vỡ trang.
  if (response.status === 404 || response.status === 403) return null;

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as ProblemDetails;
    throw new Error(problem.detail ?? problem.title ?? `API ${response.status}`);
  }

  return (await response.json()) as T;
}
