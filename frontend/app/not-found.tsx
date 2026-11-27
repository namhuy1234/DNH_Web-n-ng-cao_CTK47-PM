import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Không tìm thấy trang" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-16">
        <EmptyState
          icon={SearchX}
          title="404 — Không tìm thấy trang"
          description="Đường dẫn không tồn tại hoặc công thức đã bị gỡ."
          action={
            <>
              <Button asChild>
                <Link href="/">Về trang chủ</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/recipes">Xem công thức</Link>
              </Button>
            </>
          }
        />
      </main>
      <SiteFooter />
    </div>
  );
}
