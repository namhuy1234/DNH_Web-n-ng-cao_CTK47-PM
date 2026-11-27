import { RequireAuth } from "@/components/dashboard/RequireAuth";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { SiteHeader } from "@/components/layout/SiteHeader";

/** Bố cục trang quản lý: header chung, menu bên trái, nội dung bên phải. */
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <SiteHeader />
      <div className="container mx-auto flex flex-1 flex-col gap-6 px-4 py-8 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="rounded-xl border bg-card p-2 lg:sticky lg:top-24">
            <DashboardSidebar />
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <RequireAuth>{children}</RequireAuth>
        </main>
      </div>
    </div>
  );
}
