/**
 * Chạy hàm lấy dữ liệu và trả [dữ liệu, null] hoặc [null, lỗi].
 * Dùng thay cho try/catch bao quanh JSX: React render component con sau,
 * nên try/catch quanh JSX không bắt được lỗi render (quy tắc react-hooks/error-boundaries).
 */
export async function load<T>(fn: () => Promise<T>): Promise<[T, null] | [null, unknown]> {
  try {
    return [await fn(), null];
  } catch (error) {
    return [null, error];
  }
}
