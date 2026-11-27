"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MAIN_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { isActivePath } from "./MainNav";

/** Menu trượt cho màn hình nhỏ; trạng thái mở/đóng nằm trong ui-store. */
export function MobileNav() {
  const pathname = usePathname();
  const open = useUIStore((s) => s.mobileNavOpen);
  const setOpen = useUIStore((s) => s.setMobileNavOpen);
  const hrefs = MAIN_NAV.map((item) => item.href);

  // Đổi trang bằng bất kỳ cách nào (nút Back, liên kết trong trang...) thì đóng menu.
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Mở menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Culinary Blog</SheetTitle>
          <SheetDescription>Khám phá công thức nấu ăn</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {MAIN_NAV.map(({ href, title, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
                isActivePath(pathname, href, hrefs) && "bg-accent text-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {title}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
