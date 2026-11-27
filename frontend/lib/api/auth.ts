import { http } from "./client";
import type {
  AuthResponseDto,
  LoginRequest,
  RegisterRequest,
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
};
