"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authApi } from "@/lib/api/auth";
import { getInitials } from "@/lib/format";
import { useAuthStatus, useAuthStore } from "@/store/auth-store";

export function UserMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, hasHydrated } = useAuthStatus();

  // Chưa đọc xong localStorage: giữ chỗ để tránh nháy giao diện.
  if (!hasHydrated) return <Skeleton className="h-8 w-28" />;

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Đăng nhập</Link>
        </Button>
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/register">Đăng ký</Link>
        </Button>
      </div>
    );
  }

  async function handleLogout() {
    const { refreshToken, clearSession } = useAuthStore.getState();
    // Thu hồi refresh token ở backend; lỗi mạng vẫn đăng xuất ở trình duyệt.
    if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
    clearSession();
    // Xóa dữ liệu riêng của tài khoản trong cache (hồ sơ...) để người dùng sau không thấy.
    queryClient.removeQueries({ queryKey: ["auth"] });
    toast.success("Đã đăng xuất");
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2" aria-label="Menu tài khoản">
          <Avatar className="size-7">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
            <AvatarFallback className="bg-primary/10 text-xs text-primary">{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm sm:inline">{user.displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate font-medium">{user.displayName}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard /> Trang quản lý
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">
            <UserRound /> Hồ sơ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/password">
            <KeyRound /> Đổi mật khẩu
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
