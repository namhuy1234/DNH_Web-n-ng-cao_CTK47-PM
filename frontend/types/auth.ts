export type Role = "Admin" | "Author";

export interface UserProfileDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  roles: string[];
  emailConfirmed: boolean;
  createdAt: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  /** Số giây access token còn hiệu lực. */
  expiresIn: number;
  expiresAt: string;
  user: UserProfileDto;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

/** Dùng cho refresh và logout. */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** PATCH: chỉ gửi trường cần đổi; chuỗi rỗng nghĩa là xóa giá trị. */
export interface UpdateProfileRequest {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}
