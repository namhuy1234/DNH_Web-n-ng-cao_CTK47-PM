"use client";

import { useCurrentUser } from "@/store/auth-store";

/** Đọc tên người dùng từ auth-store (chỉ có ở trình duyệt). */
export function WelcomeTitle() {
  const user = useCurrentUser();
  return <>Xin chào, {user?.displayName ?? "bạn"}!</>;
}
