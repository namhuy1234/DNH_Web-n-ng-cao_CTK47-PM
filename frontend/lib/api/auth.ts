import { http } from "./client";
import type {
  AuthResponseDto,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  UserProfileDto,
} from "@/types";

/** Các lời gọi API xác thực (chạy ở trình duyệt). */
export const authApi = {
  login: (body: LoginRequest) => http.post<AuthResponseDto>("/auth/login", body),
  register: (body: RegisterRequest) => http.post<AuthResponseDto>("/auth/register", body),
  logout: (refreshToken: string) => http.post<void>("/auth/logout", { refreshToken }),
  me: () => http.get<UserProfileDto>("/auth/me"),
  updateProfile: (body: UpdateProfileRequest) => http.patch<UserProfileDto>("/auth/me", body),
  /** Trả phiên mới; các thiết bị khác bị đăng xuất. */
  changePassword: (body: ChangePasswordRequest) => http.post<AuthResponseDto>("/auth/change-password", body),
  /** Luôn thành công (202) dù email có tồn tại hay không. */
  forgotPassword: (body: ForgotPasswordRequest) => http.post<{ message: string }>("/auth/forgot-password", body),
  resetPassword: (body: ResetPasswordRequest) => http.post<void>("/auth/reset-password", body),
};
