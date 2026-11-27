import axios from "axios";

/** Axios dùng ở trình duyệt. Interceptor gắn token sẽ thêm khi làm đăng nhập. */
export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/v1`,
  timeout: 10_000,
});
