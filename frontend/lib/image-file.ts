/** Kiểm tra ảnh ở trình duyệt trước khi gửi, để báo lỗi ngay (backend vẫn kiểm tra lại bằng magic bytes). */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Trả về câu báo lỗi, hoặc null nếu ảnh hợp lệ. */
export function checkImageFile(file: { type: string; size: number }): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return "Chỉ nhận ảnh JPEG, PNG, WebP hoặc AVIF.";
  if (file.size > MAX_IMAGE_BYTES) return `Ảnh nặng ${formatBytes(file.size)}, vượt giới hạn 5 MB.`;
  if (file.size === 0) return "Tệp rỗng.";
  return null;
}

/** 1536 → "1,5 KB"; 5_242_880 → "5 MB". */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} ${units[unit]}`;
}
