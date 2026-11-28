"use client";

import Link from "next/link";
import { useCallback } from "react";
import { ShieldAlert } from "lucide-react";
import { refreshPublicCache } from "@/app/actions/revalidate";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthStore, useIsAdmin } from "@/store/auth-store";
import type { RecipeStatus } from "@/types";

const STATUS_STYLE: Record<RecipeStatus | "Deleted", string> = {
  Draft: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  Published: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  Archived: "bg-slate-200 text-slate-800 dark:bg-slate-500/25 dark:text-slate-200",
  Deleted: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
};

/** Nhãn trạng thái có màu riêng; bài đã xóa mềm hiện "Đã xóa" thay cho trạng thái cũ. */
export function RecipeStatusBadge({ status, deleted, className }: { status: RecipeStatus; deleted?: boolean; className?: string }) {
  const key = deleted ? "Deleted" : status;
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_STYLE[key], className)}>
      {deleted ? "Đã xóa" : STATUS_LABELS[status]}
    </Badge>
  );
}

/**
 * Sau khi sửa dữ liệu, xóa cache các trang công khai để người viết thấy ngay thay đổi.
 * Lỗi bỏ qua: cache vẫn tự hết hạn sau vài phút (cacheLife "minutes").
 */
export function usePublicCacheRefresh() {
  return useCallback(() => {
    void refreshPublicCache(useAuthStore.getState().accessToken).catch(() => false);
  }, []);
}

/** Trang chỉ dành cho quản trị viên. Backend vẫn chặn bằng 403; đây là lớp trải nghiệm. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const isAdmin = useIsAdmin();
  if (isAdmin) return children;

  return (
    <EmptyState
      icon={ShieldAlert}
      title="Chỉ dành cho quản trị viên"
      description="Tài khoản của bạn là tác giả nên không mở được trang này."
      action={
        <Button asChild variant="outline">
          <Link href="/dashboard">Về trang tổng quan</Link>
        </Button>
      }
    />
  );
}
