"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingState } from "@/components/common/Loading";
import { safeRedirect } from "@/lib/navigation";
import { useAuthStatus } from "@/store/auth-store";

/**
 * Trang chỉ dành cho khách (SRS: /login chuyển hướng nếu đã đăng nhập).
 * Vừa đăng nhập xong thì form và component này cùng chuyển về một đích (safeRedirect) nên không xung đột.
 */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStatus();
  const signedIn = hasHydrated && isAuthenticated;

  useEffect(() => {
    if (signedIn) router.replace(safeRedirect(new URLSearchParams(window.location.search).get("redirect")));
  }, [signedIn, router]);

  if (signedIn) return <LoadingState text="Bạn đã đăng nhập, đang chuyển trang..." />;
  return children;
}
