"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { isActivePath } from "./MainNav";

export function DashboardSidebar() {
  const pathname = usePathname();
  const hrefs = DASHBOARD_NAV.map((item) => item.href);

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Menu quản lý">
      {DASHBOARD_NAV.map(({ href, title, icon: Icon }) => {
        // /dashboard chỉ sáng ở đúng trang tổng quan.
        const active = href === "/dashboard" ? pathname === href : isActivePath(pathname, href, hrefs);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              active && "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {title}
          </Link>
        );
      })}
    </nav>
  );
}
