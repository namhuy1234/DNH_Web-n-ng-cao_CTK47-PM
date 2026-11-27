import Link from "next/link";
import { Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MAIN_NAV, SITE } from "@/lib/constants";
import { Logo } from "./Logo";

const ACCOUNT_LINKS = [
  { title: "Đăng nhập", href: "/login" },
  { title: "Đăng ký", href: "/register" },
  { title: "Trang quản lý", href: "/dashboard" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="container mx-auto grid gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            {SITE.tagline}. Nơi người yêu bếp chia sẻ món ngon mỗi ngày.
          </p>
          <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <Mail className="size-4" /> {SITE.email}
          </a>
        </div>
        <FooterColumn title="Khám phá" links={MAIN_NAV} />
        <FooterColumn title="Tài khoản" links={ACCOUNT_LINKS} />
      </div>
      <Separator />
      <p className="container mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
        © 2026 {SITE.name}. Đồ án môn Phát triển ứng dụng Web nâng cao.
      </p>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { title: string; href: string }[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="hover:text-primary">
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
