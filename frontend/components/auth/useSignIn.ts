"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { safeRedirect } from "@/lib/navigation";
import { useAuthStore } from "@/store/auth-store";
import type { AuthResponseDto } from "@/types";

/** Lưu phiên sau khi đăng nhập/đăng ký rồi quay về trang đã yêu cầu (chỉ đường dẫn nội bộ). */
export function useSignIn() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  return (auth: AuthResponseDto) => {
    // Bỏ dữ liệu của phiên trước (nếu có) để không lẫn sang tài khoản mới.
    queryClient.removeQueries({ queryKey: ["auth"] });
    setSession(auth);
    toast.success(`Xin chào, ${auth.user.displayName}!`);
    router.replace(safeRedirect(new URLSearchParams(window.location.search).get("redirect")));
  };
}
