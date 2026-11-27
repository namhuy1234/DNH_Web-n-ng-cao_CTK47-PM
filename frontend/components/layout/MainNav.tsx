"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** "/" chỉ khớp chính nó; các mục khác khớp cả trang con, trừ khi có mục cụ thể hơn. */
export function isActivePath(pathname: string, href: string, allHrefs: string[] = []) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !allHrefs.some((other) => other !== href && other.startsWith(href) && pathname.startsWith(other));
}

export function MainNav() {
  return <MainNavLinks pathname={usePathname()} />;
}

/** Phần hiển thị; pathname null (khi đang chờ Suspense) thì chưa tô mục nào. */
export function MainNavLinks({ pathname }: { pathname: string | null }) {
  const hrefs = MAIN_NAV.map((item) => item.href);

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {MAIN_NAV.map((item) => {
        const active = pathname !== null && isActivePath(pathname, item.href, hrefs);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              active && "bg-accent text-accent-foreground",
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
