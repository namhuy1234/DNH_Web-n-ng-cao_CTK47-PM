import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { MainNav } from "./MainNav";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

/** Header dùng chung: Server Component, chỉ các phần tương tác là Client Component. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        <MobileNav />
        <Logo />
        <MainNav />
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Tìm kiếm" className="md:hidden">
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
