import type { RecipeDifficulty, RecipeStatus } from "@/types";

export const DIFFICULTY_LABELS: Record<RecipeDifficulty, string> = {
  Easy: "Dễ",
  Medium: "Trung bình",
  Hard: "Khó",
  Expert: "Chuyên gia",
};

export const STATUS_LABELS: Record<RecipeStatus, string> = {
  Draft: "Bản nháp",
  Published: "Đã đăng",
  Archived: "Lưu trữ",
};

// Cố định múi giờ Việt Nam: server (thường chạy UTC) và trình duyệt cho cùng một ngày.
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

/** "2026-10-14T08:00:00Z" → "14/10/2026". Chuỗi sai định dạng trả về "". */
export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}

/** 45 → "45 phút", 90 → "1 giờ 30 phút", 120 → "2 giờ". */
export function formatDuration(minutes: number) {
  // Làm tròn trước khi chia, tránh kết quả "60 phút" với 59.6 hay "1 giờ 60 phút" với 119.7.
  const total = Number.isFinite(minutes) ? Math.round(minutes) : 0;
  if (total <= 0) return "0 phút";
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} phút`;
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`;
}

/** "Đặng Nam Huy" → "NH" (chữ cái đầu của hai từ cuối) để hiện trong avatar. */
export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(-2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}
