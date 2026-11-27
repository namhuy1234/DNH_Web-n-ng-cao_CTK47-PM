import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { getErrorMessage, getFieldErrors } from "@/lib/api/errors";

/**
 * Gắn lỗi theo trường từ backend (422 + errors) vào đúng ô của form.
 * Trả về câu báo lỗi chung để hiện phía trên form; null nếu mọi lỗi đã gắn được vào ô.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  const fieldErrors = getFieldErrors(error);
  let unmatched = false;

  for (const [field, message] of Object.entries(fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) setError(field as Path<T>, { type: "server", message });
    else unmatched = true;
  }

  return Object.keys(fieldErrors).length === 0 || unmatched ? getErrorMessage(error) : null;
}
