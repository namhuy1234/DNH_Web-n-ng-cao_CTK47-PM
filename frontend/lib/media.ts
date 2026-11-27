const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

/** Ảnh tải lên backend trả về dạng "/uploads/..."; ghép thêm địa chỉ API để trình duyệt tải được. */
export function mediaUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith("/") ? `${API_ORIGIN}${url}` : null;
}
