import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth-store";
import type { AuthResponseDto } from "@/types";
import { toApiError } from "./errors";

export const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/v1`;

/** Axios dùng ở trình duyệt: tự gắn token, tự làm mới token khi gặp 401. */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Các endpoint này không gắn token và không tự refresh khi bị 401.
const PUBLIC_AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/google", "/auth/refresh"];
const isPublicAuthPath = (url = "") => PUBLIC_AUTH_PATHS.some((path) => url.startsWith(path));

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken && !isPublicAuthPath(config.url)) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Nhiều request cùng bị 401 chỉ gọi /auth/refresh một lần rồi dùng chung kết quả.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setSession, clearSession } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    // Dùng axios gốc để không đi qua interceptor của apiClient (tránh lặp vô hạn).
    const { data } = await axios.post<AuthResponseDto>(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 10_000 });
    setSession(data);
    return data.accessToken;
  } catch (error) {
    // Chỉ đăng xuất khi máy chủ khẳng định refresh token không còn dùng được.
    // Mất mạng, quá thời gian chờ hay lỗi 5xx thì giữ phiên để người dùng thử lại.
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 400 || status === 401 || status === 403) clearSession();
    return null;
  }
}

/** Token mà request đã gửi đi (nếu có). */
function sentToken(config: RetriableConfig) {
  const header = String(config.headers.Authorization ?? "");
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as RetriableConfig | undefined;
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;

    if (status === 401 && config && !config._retried && !isPublicAuthPath(config.url)) {
      config._retried = true;
      const current = useAuthStore.getState().accessToken;
      // Request gửi bằng token cũ nhưng token đã được làm mới trong lúc chờ:
      // gửi lại bằng token mới, không gọi refresh thêm lần nữa (refresh token đã bị xoay vòng).
      const newToken =
        current && current !== sentToken(config)
          ? current
          : await (refreshPromise ??= refreshAccessToken().finally(() => {
              refreshPromise = null;
            }));
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      }
    }

    // Mọi lỗi trả ra ngoài đều là ApiError có message tiếng Việt.
    return Promise.reject(toApiError(error));
  },
);

/** Các hàm gọn trả thẳng dữ liệu (response.data). */
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) => apiClient.get<T>(url, config).then((r) => r.data),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, body, config).then((r) => r.data),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, body, config).then((r) => r.data),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, body, config).then((r) => r.data),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) => apiClient.delete<T>(url, config).then((r) => r.data),
};
