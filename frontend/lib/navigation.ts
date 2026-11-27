const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Chỉ nhận đường dẫn nội bộ cho tham số ?redirect=. Chặn "//evil.com",
 * "/\evil.com" (trình duyệt coi "\" như "/"), "https://..." và "javascript:".
 */
export function safeRedirect(target: string | null | undefined, fallback = "/dashboard") {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.includes("\\")) {
    return fallback;
  }
  try {
    const base = "http://noi-bo.local";
    const url = new URL(target, base);
    if (url.origin !== base) return fallback;
    // Không quay lại trang đăng nhập/đăng ký...: người đã đăng nhập sẽ bị đẩy đi tiếp, thành vòng lặp.
    if (AUTH_PAGES.some((page) => url.pathname === page || url.pathname.startsWith(`${page}/`))) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
