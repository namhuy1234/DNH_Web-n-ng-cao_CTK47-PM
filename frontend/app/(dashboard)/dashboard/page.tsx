import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { WelcomeTitle } from "@/components/dashboard/WelcomeTitle";
import { Button } from "@/components/ui/button";

// Nội dung phụ thuộc trạng thái đăng nhập ở trình duyệt nên không dựng sẵn App Shell.
export const instant = false;

export const metadata: Metadata = { title: "Trang quản lý" };

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <WelcomeTitle />
          </h1>
          <p className="text-muted-foreground">Tổng quan công thức theo trạng thái. Bấm vào ô để xem danh sách.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/recipes/new">
            <FilePlus2 /> Viết công thức
          </Link>
        </Button>
      </div>
      <DashboardOverview />
    </div>
  );
}
