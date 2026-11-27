export type PageItem = number | "ellipsis";

/**
 * Danh sách số trang cần hiện, rút gọn bằng dấu "..." khi có nhiều trang.
 * Ví dụ trang 5/10 → [1, "ellipsis", 4, 5, 6, "ellipsis", 10].
 */
export function getPageItems(page: number, totalPages: number, siblings = 1): PageItem[] {
  if (totalPages <= 0) return [];
  const current = Math.min(Math.max(page, 1), totalPages);

  // Đủ ít trang thì hiện tất cả: 2 đầu mút + trang hiện tại + 2 bên + 2 dấu "...".
  if (totalPages <= siblings * 2 + 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const start = Math.max(current - siblings, 2);
  const end = Math.min(current + siblings, totalPages - 1);
  const items: PageItem[] = [1];

  if (start > 2) items.push("ellipsis");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);

  return items;
}

/** Đọc số trang từ query string; giá trị sai trả về 1. */
export function parsePage(value: string | string[] | undefined) {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
