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
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
