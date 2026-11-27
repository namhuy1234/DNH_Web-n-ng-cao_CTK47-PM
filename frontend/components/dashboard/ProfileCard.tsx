"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authApi } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDate, getInitials } from "@/lib/format";
import { useAuthStore, useCurrentUser } from "@/store/auth-store";

export function ProfileCard() {
  const user = useCurrentUser();
  const setUser = useAuthStore((s) => s.setUser);

  // Lấy hồ sơ mới nhất từ GET /auth/me; apiClient tự gắn token và tự refresh khi gặp 401.
  // Khóa cache gắn với id người dùng để đổi tài khoản không lấy nhầm hồ sơ cũ.
  const { data, error, isFetching } = useQuery({
    queryKey: ["auth", "me", user?.id],
    queryFn: authApi.me,
    enabled: !!user,
  });

  useEffect(() => {
    // Chỉ cập nhật khi đúng là hồ sơ của người đang đăng nhập.
    if (data && data.id === user?.id) setUser(data);
  }, [data, user?.id, setUser]);

  if (error) return <ErrorState title="Không tải được hồ sơ" message={getErrorMessage(error)} />;
  if (!user) return null;

  const rows = [
    ["Email", user.email],
    ["Xác thực email", user.emailConfirmed ? "Đã xác thực" : "Chưa xác thực"],
    ["Ngày tham gia", formatDate(user.createdAt)],
    ["Giới thiệu", user.bio || "Chưa có"],
  ];

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
            <AvatarFallback className="bg-primary/10 text-lg text-primary">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle className="text-xl">{user.displayName}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {user.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role === "Admin" ? "Quản trị viên" : "Tác giả"}
                </Badge>
              ))}
              <span className="text-xs">{isFetching ? "Đang đồng bộ..." : "Đã đồng bộ với máy chủ"}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="text-sm">
          {rows.map(([label, value], i) => (
            <div key={label}>
              {i > 0 && <Separator className="my-3" />}
              <div className="grid grid-cols-[140px_1fr] gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
