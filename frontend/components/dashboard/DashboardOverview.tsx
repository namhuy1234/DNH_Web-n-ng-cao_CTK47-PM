"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Archive, BookOpenCheck, FilePen, LayoutList, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api/errors";
import { manageApi } from "@/lib/api/manage";
import { useIsAdmin } from "@/store/auth-store";
import type { RecipeScope } from "@/types";
import { ManagedRecipeTable } from "./ManageRecipes";

/** Trang tổng quan: số bài theo trạng thái (của tôi, và toàn hệ thống nếu là admin) + bài sửa gần đây. */
export function DashboardOverview() {
  const isAdmin = useIsAdmin();
  const recent = useQuery({ queryKey: ["manage", "list", { pageSize: 5 }], queryFn: () => manageApi.list({ pageSize: 5 }) });

  return (
    <div className="space-y-8">
      <StatsRow scope="mine" title="Công thức của tôi" />
      {isAdmin && <StatsRow scope="all" title="Toàn hệ thống" />}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sửa gần đây</h2>
          <Button asChild variant="link">
            <Link href="/dashboard/recipes">Xem tất cả</Link>
          </Button>
        </div>
        {recent.error ? (
          <ErrorState message={getErrorMessage(recent.error)} />
        ) : !recent.data ? (
          <LoadingState />
        ) : recent.data.items.length === 0 ? (
          <EmptyState
            title="Bạn chưa có công thức nào"
            description="Viết công thức đầu tiên, lưu nháp rồi đăng khi đã ưng ý."
            action={
              <Button asChild>
                <Link href="/dashboard/recipes/new">Viết công thức</Link>
              </Button>
            }
          />
        ) : (
          <ManagedRecipeTable recipes={recent.data.items} />
        )}
      </section>
    </div>
  );
}

function StatsRow({ scope, title }: { scope: RecipeScope; title: string }) {
  const stats = useQuery({ queryKey: ["manage", "stats", scope], queryFn: () => manageApi.stats(scope) });
  const base = scope === "all" ? "/dashboard/recipes?scope=all" : "/dashboard/recipes?";
  const link = (status?: string) => (status ? `${base}${scope === "all" ? "&" : ""}status=${status}` : base.replace(/\?$/, ""));

  const cards = stats.data
    ? [
        { label: "Đang có", value: stats.data.total, icon: LayoutList, href: link() },
        { label: "Đã đăng", value: stats.data.published, icon: BookOpenCheck, href: link("Published") },
        { label: "Bản nháp", value: stats.data.draft, icon: FilePen, href: link("Draft") },
        { label: "Lưu trữ", value: stats.data.archived, icon: Archive, href: link("Archived") },
        { label: "Đã xóa", value: stats.data.deleted, icon: Trash2, href: link("Deleted") },
      ]
    : [];

  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {stats.error ? (
        <ErrorState message={getErrorMessage(stats.error)} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {!stats.data
            ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            : cards.map(({ label, value, icon: Icon, href }) => (
                <Link key={label} href={href} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Card className="gap-1 py-4 transition-colors hover:border-primary">
                    <CardHeader className="px-4">
                      <div className="flex items-center justify-between">
                        <CardDescription>{label}</CardDescription>
                        <Icon className="size-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent className="px-4">
                      <CardTitle className="text-3xl">{value}</CardTitle>
                    </CardContent>
                  </Card>
                </Link>
              ))}
        </div>
      )}
    </section>
  );
}
