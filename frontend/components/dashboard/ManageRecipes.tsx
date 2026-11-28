"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChefHat, ExternalLink, MoreHorizontal, Pencil, Search } from "lucide-react";
import { AppPagination } from "@/components/common/AppPagination";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/api/errors";
import { manageApi } from "@/lib/api/manage";
import { DIFFICULTY_LABELS, formatDate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { availableActions } from "@/lib/recipe-status";
import { useIsAdmin } from "@/store/auth-store";
import type { ManageStatus, ManagedRecipeDto, RecipeScope, RecipeStatsDto } from "@/types";
import { useRecipeAction } from "./recipe-editor/useRecipeAction";
import { RecipeStatusBadge } from "./shared";

const PAGE_SIZE = 10;
const TABS: { value: ManageStatus | "all"; label: string; count: (s: RecipeStatsDto) => number }[] = [
  { value: "all", label: "Tất cả", count: (s) => s.total },
  { value: "Draft", label: "Bản nháp", count: (s) => s.draft },
  { value: "Published", label: "Đã đăng", count: (s) => s.published },
  { value: "Archived", label: "Lưu trữ", count: (s) => s.archived },
  { value: "Deleted", label: "Đã xóa", count: (s) => s.deleted },
];
const STATUSES = new Set(TABS.map((t) => t.value));

/**
 * Bảng quản lý công thức. Bộ lọc nằm trên URL (?status=&q=&page=&scope=) nên tải lại trang
 * hay gửi liên kết vẫn giữ nguyên.
 */
export function ManageRecipes() {
  const router = useRouter();
  const params = useSearchParams();
  const isAdmin = useIsAdmin();

  const rawStatus = params.get("status") ?? "all";
  const status = (STATUSES.has(rawStatus as ManageStatus) ? rawStatus : "all") as ManageStatus | "all";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const scope: RecipeScope = isAdmin && params.get("scope") === "all" ? "all" : "mine";
  const [keyword, setKeyword] = useState(q);

  function update(change: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(change)) {
      if (value === null || value === "" || (key === "status" && value === "all") || (key === "scope" && value === "mine"))
        next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in change)) next.delete("page"); // đổi bộ lọc thì về trang 1
    const text = next.toString();
    router.replace(text ? `?${text}` : "?", { scroll: false });
  }

  const query = { page, pageSize: PAGE_SIZE, status: status === "all" ? undefined : status, q: q || undefined, scope };
  const list = useQuery({
    queryKey: ["manage", "list", query],
    queryFn: () => manageApi.list(query),
    placeholderData: keepPreviousData,
  });
  const stats = useQuery({ queryKey: ["manage", "stats", scope], queryFn: () => manageApi.stats(scope) });

  // Xóa/đăng/khôi phục bài cuối cùng của trang cuối thì trang đó rỗng: lùi về trang cuối còn dữ liệu
  // (nếu không, bảng báo "chưa có công thức" và mất luôn thanh phân trang).
  const lastPage = Math.max(1, list.data?.totalPages ?? 1);
  const overflow = !!list.data && !list.isPlaceholderData && list.data.items.length === 0 && page > lastPage;
  useEffect(() => {
    if (overflow) update({ page: lastPage > 1 ? String(lastPage) : null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi phát hiện trang vượt quá
  }, [overflow, lastPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={status} onValueChange={(value) => update({ status: value })}>
          <TabsList className="h-auto flex-wrap">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {stats.data && <span className="ml-1 text-xs text-muted-foreground">({tab.count(stats.data)})</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-2 sm:flex-row">
          {isAdmin && (
            <Select value={scope} onValueChange={(value) => update({ scope: value })}>
              <SelectTrigger className="sm:w-44" aria-label="Phạm vi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mine">Bài của tôi</SelectItem>
                <SelectItem value="all">Mọi tác giả</SelectItem>
              </SelectContent>
            </Select>
          )}
          <form
            role="search"
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: keyword.trim() });
            }}
          >
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên món, Enter để tìm"
              aria-label="Tìm công thức theo tên"
              className="pl-8 sm:w-64"
              maxLength={100}
            />
          </form>
        </div>
      </div>

      {list.error ? (
        <ErrorState message={getErrorMessage(list.error)} action={<Button onClick={() => list.refetch()}>Thử lại</Button>} />
      ) : !list.data || overflow ? (
        <LoadingState text="Đang tải công thức..." />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title={q ? `Không có công thức nào khớp "${q}"` : "Chưa có công thức nào ở mục này"}
          description={status === "Deleted" ? "Bài bị xóa sẽ nằm ở đây để bạn khôi phục khi cần." : "Bắt đầu chia sẻ món ngon của bạn."}
          action={
            <Button asChild>
              <Link href="/dashboard/recipes/new">Viết công thức</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ManagedRecipeTable recipes={list.data.items} showAuthor={scope === "all"} />
          <AppPagination
            page={list.data.page}
            totalPages={list.data.totalPages}
            basePath="/dashboard/recipes"
            searchParams={{ status: status === "all" ? undefined : status, q: q || undefined, scope: scope === "all" ? "all" : undefined }}
          />
        </>
      )}
    </div>
  );
}

/** Bảng công thức dùng ở trang danh sách và trang tổng quan. */
export function ManagedRecipeTable({ recipes, showAuthor = false }: { recipes: ManagedRecipeDto[]; showAuthor?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Công thức</TableHead>
            <TableHead className="hidden md:table-cell">Danh mục</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="hidden sm:table-cell">Cập nhật</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipes.map((recipe) => (
            <RecipeRow key={recipe.id} recipe={recipe} showAuthor={showAuthor} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RecipeRow({ recipe, showAuthor }: { recipe: ManagedRecipeDto; showAuthor: boolean }) {
  const action = useRecipeAction();
  // Hộp thoại xác nhận nằm ngoài menu: menu đóng lại sẽ không kéo hộp thoại đóng theo.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const actions = availableActions(recipe.status, recipe.isDeleted);
  const deleteAction = actions.find((a) => a.destructive);
  const image = mediaUrl(recipe.primaryImageUrl);
  const editHref = `/dashboard/recipes/${recipe.id}/edit`;

  return (
    <TableRow data-testid="recipe-row">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh thu nhỏ từ máy chủ API */}
            {image && <img src={image} alt="" className="size-full object-cover" loading="lazy" />}
          </div>
          <div className="min-w-0">
            {recipe.isDeleted ? (
              <span className="font-medium text-muted-foreground line-through">{recipe.title}</span>
            ) : (
              <Link href={editHref} className="font-medium hover:text-primary">
                {recipe.title}
              </Link>
            )}
            <p className="text-xs text-muted-foreground">
              {DIFFICULTY_LABELS[recipe.difficulty]}
              {showAuthor && ` · ${recipe.authorName}`}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">{recipe.categoryName}</TableCell>
      <TableCell>
        <RecipeStatusBadge status={recipe.status} deleted={recipe.isDeleted} />
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {formatDate(recipe.updatedAt ?? recipe.createdAt)}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${recipe.title}`} disabled={action.isPending}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!recipe.isDeleted && (
              <DropdownMenuItem asChild>
                <Link href={editHref}>
                  <Pencil /> Sửa
                </Link>
              </DropdownMenuItem>
            )}
            {recipe.status === "Published" && !recipe.isDeleted && (
              <DropdownMenuItem asChild>
                <Link href={`/recipes/${recipe.slug}`} target="_blank">
                  <ExternalLink /> Xem bài
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {actions
              .filter((a) => !a.destructive)
              .map((info) => (
                <DropdownMenuItem key={info.action} onSelect={() => action.mutate({ id: recipe.id, info })}>
                  {info.label}
                </DropdownMenuItem>
              ))}
            {deleteAction && (
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                {deleteAction.label}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {deleteAction && (
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title={`Xóa "${recipe.title}"?`}
            description="Bài sẽ bị ẩn khỏi mọi trang và chuyển vào mục Đã xóa. Bạn có thể khôi phục lại về bản nháp."
            confirmText="Xóa"
            destructive
            onConfirm={() => action.mutateAsync({ id: recipe.id, info: deleteAction })}
          />
        )}
      </TableCell>
    </TableRow>
  );
}
