"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";

/**
 * Các store persist đặt skipHydration nên lần render đầu ở trình duyệt giống
 * hệt HTML từ server. Sau đó mới đọc localStorage để khôi phục trạng thái.
 */
export function StoreHydration() {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
    void useUIStore.persist.rehydrate();

    // Tab khác đăng nhập, đăng xuất hoặc làm mới token (refresh token bị xoay vòng):
    // đọc lại ngay, nếu không tab này sẽ refresh bằng token cũ và bị đăng xuất.
    function onStorage(event: StorageEvent) {
      if (event.key === useAuthStore.persist.getOptions().name) void useAuthStore.persist.rehydrate();
      if (event.key === useUIStore.persist.getOptions().name) void useUIStore.persist.rehydrate();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
