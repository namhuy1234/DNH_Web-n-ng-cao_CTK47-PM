import axios from "axios";
import type { ProblemDetails } from "@/types";

/** Câu thông báo mặc định khi backend không gửi detail. */
const STATUS_MESSAGES: Record<number, string> = {
  0: "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.",
  400: "Dữ liệu gửi lên không hợp lệ.",
  401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu yêu cầu.",
  409: "Dữ liệu đã bị thay đổi hoặc bị trùng. Vui lòng tải lại trang.",
  413: "Tệp tải lên quá lớn.",
  422: "Dữ liệu không đúng quy tắc nghiệp vụ.",
  423: "Tài khoản tạm thời bị khóa. Vui lòng thử lại sau.",
  429: "Bạn thao tác quá nhanh. Vui lòng chờ một lát rồi thử lại.",
  500: "Máy chủ gặp sự cố. Vui lòng thử lại sau.",
  503: "Dịch vụ tạm thời không khả dụng.",
};

export function messageForStatus(status: number) {
  return STATUS_MESSAGES[status] ?? (status >= 500 ? STATUS_MESSAGES[500] : "Đã có lỗi xảy ra.");
}

/**
 * Lỗi thống nhất cho mọi lời gọi API. Component chỉ cần đọc message, status
 * và fieldErrors mà không phải biết lỗi đến từ axios, fetch hay mất mạng.
 */
export class ApiError extends Error {
  readonly status: number;
  /** Mã lỗi nghiệp vụ trong trường `type` của ProblemDetails, ví dụ RECIPE_NOT_FOUND. */
  readonly code?: string;
  readonly fieldErrors: Record<string, string[]>;
  readonly traceId?: string;

  constructor(status: number, problem: ProblemDetails = {}) {
    super(problem.detail || problem.title || messageForStatus(status));
    this.name = "ApiError";
    this.status = status;
    this.code = problem.type;
    this.fieldErrors = problem.errors ?? {};
    this.traceId = problem.traceId;
  }

  get isNetworkError() {
    return this.status === 0;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isValidationError() {
    return this.status === 400 || this.status === 422;
  }
}

/** Chuyển lỗi bất kỳ (AxiosError, Error, chuỗi...) thành ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const data = error.response.data;
      const problem = data && typeof data === "object" ? (data as ProblemDetails) : {};
      return new ApiError(error.response.status, problem);
    }
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError(0, { detail: "Máy chủ phản hồi quá lâu. Vui lòng thử lại." });
    }
    return new ApiError(0);
  }

  if (error instanceof Error && error.name === "TimeoutError") {
    return new ApiError(0, { detail: "Máy chủ phản hồi quá lâu. Vui lòng thử lại." });
  }

  return new ApiError(500, { detail: error instanceof Error ? error.message : undefined });
}

/** Lấy câu thông báo để hiện cho người dùng. */
export function getErrorMessage(error: unknown) {
  return toApiError(error).message;
}

/** Lỗi đầu tiên của từng trường, dùng để hiện dưới ô nhập. Tên trường đổi về camelCase. */
export function getFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(toApiError(error).fieldErrors)) {
    const key = field.charAt(0).toLowerCase() + field.slice(1);
    if (messages.length > 0) result[key] = messages[0];
  }
  return result;
}
