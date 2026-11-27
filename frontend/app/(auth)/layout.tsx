import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

/** Bố cục riêng cho đăng nhập/đăng ký: không có header, form nằm giữa màn hình. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-orange-50 via-background to-amber-50 dark:from-orange-950/30 dark:to-background">
      <header className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
          ← Về trang chủ
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">© 2026 Culinary Blog</footer>
    </div>
  );
}
