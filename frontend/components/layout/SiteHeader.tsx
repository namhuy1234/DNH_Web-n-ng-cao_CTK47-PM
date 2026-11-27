import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "./Logo";
import { MainNav, MainNavLinks } from "./MainNav";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

/** Header dùng chung: Server Component, chỉ các phần tương tác là Client Component. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* Menu đọc đường dẫn hiện tại (dữ liệu runtime) nên nằm trong Suspense,
            phần còn lại của header vẫn được dựng sẵn cho cả route động như /recipes/[slug]. */}
        <Suspense fallback={<span className="size-8 md:hidden" />}>
          <MobileNav />
        </Suspense>
        <Logo />
        <Suspense fallback={<MainNavLinks pathname={null} />}>
          <MainNav />
        </Suspense>
        <div className="ml-auto flex items-center gap-2">
          {/* Ô tìm nhanh: gửi GET tới trang tìm kiếm, không cần JavaScript */}
          <form action="/recipes/search" role="search" className="relative hidden lg:block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" type="search" placeholder="Tìm công thức..." aria-label="Tìm công thức" className="h-8 w-56 pl-8" />
          </form>
          <Button asChild variant="ghost" size="icon" aria-label="Tìm kiếm" className="lg:hidden">
            <Link href="/recipes/search">
              <Search />
            </Link>
          </Button>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
