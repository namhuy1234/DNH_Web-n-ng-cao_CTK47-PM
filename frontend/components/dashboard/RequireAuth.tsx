"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { useAuthStatus } from "@/store/auth-store";

/**
 * Chặn ở phía giao diện dựa trên auth-store. Backend vẫn kiểm tra token ở mọi
 * API nên đây chỉ là lớp trải nghiệm; Lab 7 bổ sung proxy.ts chặn từ server.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, hasHydrated } = useAuthStatus();

  if (!hasHydrated) return <LoadingState text="Đang kiểm tra đăng nhập..." />;

  if (!isAuthenticated) {
    return (
      <EmptyState
        icon={LockKeyhole}
        title="Bạn cần đăng nhập"
        description="Trang quản lý chỉ dành cho tác giả đã đăng nhập."
        action={
          <Button asChild>
            <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>Đăng nhập</Link>
          </Button>
        }
      />
    );
  }

  return children;
}
