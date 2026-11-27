import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { AuthResponseDto, UserProfileDto } from "@/types";

interface AuthState {
  user: UserProfileDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Thời điểm access token hết hạn (ISO). */
  expiresAt: string | null;
  /** true khi đã đọc xong localStorage; trước đó chưa biết người dùng có đăng nhập không. */
  hasHydrated: boolean;

  setSession: (auth: AuthResponseDto) => void;
  setUser: (user: UserProfileDto) => void;
  clearSession: () => void;
}

const emptySession = { user: null, accessToken: null, refreshToken: null, expiresAt: null };

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...emptySession,
      hasHydrated: false,

      setSession: (auth) =>
        set({
          user: auth.user,
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          expiresAt: auth.expiresAt,
        }),
      setUser: (user) => set({ user }),
      clearSession: () => set(emptySession),
    }),
    {
      name: "culinary-blog-auth",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Server không có localStorage: đọc lại sau khi hydrate (StoreHydration) để tránh lệch HTML.
      skipHydration: true,
      // Không lưu cờ hasHydrated và các hàm.
      partialize: ({ user, accessToken, refreshToken, expiresAt }) => ({ user, accessToken, refreshToken, expiresAt }),
      onRehydrateStorage: () => () => useAuthStore.setState({ hasHydrated: true }),
    },
  ),
);

// ── Selector: component chỉ render lại khi đúng phần nó dùng thay đổi ──
export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.accessToken !== null);
export const useIsAdmin = () => useAuthStore((s) => s.user?.roles.includes("Admin") ?? false);

/** Chọn nhiều giá trị cùng lúc phải bọc useShallow (Zustand 5). */
export const useAuthStatus = () =>
  useAuthStore(
    useShallow((s) => ({
      user: s.user,
      isAuthenticated: s.accessToken !== null,
      hasHydrated: s.hasHydrated,
    })),
  );
