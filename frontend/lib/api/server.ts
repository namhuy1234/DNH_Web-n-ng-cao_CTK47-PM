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

/** GET từ phía server; trả null khi 404, ném lỗi cho các mã khác. */
export async function apiGet<T>(path: string, query?: Query): Promise<T | null> {
  // Giới hạn thời gian chờ để trang không treo khi API không phản hồi.
  const response = await fetch(`${API_URL}/api/v1${path}${toQueryString(query)}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404) return null;

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as ProblemDetails;
    throw new Error(problem.detail ?? problem.title ?? `API ${response.status}`);
  }

  return (await response.json()) as T;
}
