"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Lock, LockOpen, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/Loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/api/errors";
import { usersApi } from "@/lib/api/manage";
import { formatDate, getInitials } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { useCurrentUser } from "@/store/auth-store";
import type { UserListItemDto, UserListQuery } from "@/types";

const PAGE_SIZE = 10;
type RoleTab = "all" | "Admin" | "Author";

/** Danh sách người dùng cho quản trị viên: lọc vai trò, trạng thái, tìm theo tên/email, khóa/mở khóa. */
export function UsersAdmin() {
  const [role, setRole] = useState<RoleTab>("all");
  const [status, setStatus] = useState<"all" | "active" | "locked">("all");
  const [keyword, setKeyword] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const query: UserListQuery = {
    page,
    pageSize: PAGE_SIZE,
    role: role === "all" ? undefined : role,
    status: status === "all" ? undefined : status,
    q: q || undefined,
  };
  const users = useQuery({ queryKey: ["users", query], queryFn: () => usersApi.list(query), placeholderData: keepPreviousData });

  // Khóa/mở khóa người cuối cùng của trang khi đang lọc theo trạng thái thì trang đó rỗng: lùi về trang cuối.
  const lastPage = Math.max(1, users.data?.totalPages ?? 1);
  const overflow = !!users.data && !users.isPlaceholderData && users.data.items.length === 0 && page > lastPage;
  // Điều chỉnh state ngay trong lúc render (cách React khuyến nghị thay cho useEffect).
  if (overflow) setPage(lastPage);

  const filter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={role} onValueChange={(v) => filter(setRole)(v as RoleTab)}>
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="Admin">Quản trị viên</TabsTrigger>
            <TabsTrigger value="Author">Tác giả</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={status} onValueChange={(v) => filter(setStatus)(v as typeof status)}>
            <SelectTrigger className="sm:w-44" aria-label="Trạng thái tài khoản">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi trạng thái</SelectItem>
              <SelectItem value="active">Đang hoạt động</SelectItem>
              <SelectItem value="locked">Đã khóa</SelectItem>
            </SelectContent>
          </Select>
          <form
            role="search"
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              filter(setQ)(keyword.trim());
            }}
          >
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tên hoặc email, Enter để tìm"
              aria-label="Tìm người dùng"
              className="pl-8 sm:w-64"
              maxLength={100}
            />
          </form>
        </div>
      </div>

      {users.error ? (
        <ErrorState message={getErrorMessage(users.error)} action={<Button onClick={() => users.refetch()}>Thử lại</Button>} />
      ) : !users.data || overflow ? (
        <LoadingState text="Đang tải người dùng..." />
      ) : users.data.items.length === 0 ? (
        <EmptyState icon={Users} title="Không có người dùng nào khớp bộ lọc" />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Tìm thấy {users.data.totalCount} tài khoản.</p>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead className="hidden md:table-cell">Công thức</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="hidden lg:table-cell">Tham gia</TableHead>
                  <TableHead className="w-28">
                    <span className="sr-only">Thao tác</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data.items.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
              </TableBody>
            </Table>
          </div>
          {users.data.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trang trước
              </Button>
              <span>
                Trang {users.data.page}/{users.data.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={!users.data.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                Trang sau
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UserRow({ user }: { user: UserListItemDto }) {
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const isAdmin = user.roles.includes("Admin");
  const isSelf = user.id === me?.id;
  const avatar = mediaUrl(user.avatarUrl);

  const toggle = useMutation({
    mutationFn: () => (user.isActive ? usersApi.lock(user.id) : usersApi.unlock(user.id)),
    onSuccess: (updated) => {
      toast.success(updated.isActive ? `Đã mở khóa ${updated.displayName}` : `Đã khóa ${updated.displayName}`);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <TableRow data-testid="user-row">
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            {avatar && <AvatarImage src={avatar} alt="" />}
            <AvatarFallback className="bg-primary/10 text-xs text-primary">{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {user.displayName}
              {isSelf && <span className="ml-1 text-xs text-muted-foreground">(bạn)</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <Badge key={role} variant={role === "Admin" ? "default" : "secondary"}>
              {role === "Admin" ? "Quản trị viên" : "Tác giả"}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {user.recipeCount} bài <span className="text-muted-foreground">({user.publishedCount} đã đăng)</span>
      </TableCell>
      <TableCell>
        {!user.isActive ? (
          <Badge variant="destructive">Đã khóa</Badge>
        ) : user.isLockedOut ? (
          <Badge variant="outline" title="Nhập sai mật khẩu nhiều lần, tự mở sau 15 phút">
            Tạm khóa
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">
            Hoạt động
          </Badge>
        )}
      </TableCell>
      <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(user.createdAt)}</TableCell>
      <TableCell>
        {isSelf || isAdmin ? (
          <span className="text-xs text-muted-foreground">{isSelf ? "Tài khoản của bạn" : "Không thể khóa"}</span>
        ) : (
          <ConfirmDialog
            trigger={
              <Button variant={user.isActive ? "outline" : "secondary"} size="sm" disabled={toggle.isPending}>
                {user.isActive ? <Lock /> : <LockOpen />} {user.isActive ? "Khóa" : "Mở khóa"}
              </Button>
            }
            title={user.isActive ? `Khóa tài khoản ${user.displayName}?` : `Mở khóa ${user.displayName}?`}
            description={
              user.isActive
                ? "Người này bị đăng xuất khỏi mọi thiết bị ngay lập tức và không đăng nhập lại được cho tới khi được mở khóa. Công thức của họ vẫn được giữ nguyên."
                : "Người này sẽ đăng nhập lại được bằng mật khẩu cũ."
            }
            confirmText={user.isActive ? "Khóa tài khoản" : "Mở khóa"}
            destructive={user.isActive}
            onConfirm={() => toggle.mutateAsync()}
          />
        )}
      </TableCell>
    </TableRow>
  );
}
