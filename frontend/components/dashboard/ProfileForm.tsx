"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState, Spinner } from "@/components/common/Loading";
import { FormAlert, TextAreaField, TextField } from "@/components/forms/FormField";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDate, getInitials } from "@/lib/format";
import { applyServerErrors } from "@/lib/forms";
import { profileSchema, type ProfileValues } from "@/lib/validation/auth";
import { useAuthStore, useCurrentUser } from "@/store/auth-store";
import type { UpdateProfileRequest, UserProfileDto } from "@/types";

const toValues = (user: UserProfileDto): ProfileValues => ({
  displayName: user.displayName,
  avatarUrl: user.avatarUrl ?? "",
  bio: user.bio ?? "",
});

/** PATCH chỉ gửi trường thay đổi; chuỗi rỗng nghĩa là xóa giá trị (quy ước của API). */
export function profilePatch(before: ProfileValues, after: ProfileValues): UpdateProfileRequest {
  const patch: UpdateProfileRequest = {};
  if (after.displayName !== before.displayName) patch.displayName = after.displayName;
  if (after.avatarUrl !== before.avatarUrl) patch.avatarUrl = after.avatarUrl;
  if (after.bio !== before.bio) patch.bio = after.bio;
  return patch;
}

export function ProfileForm() {
  const user = useCurrentUser();
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  // Hồ sơ mới nhất từ GET /auth/me; khóa cache gắn với id để đổi tài khoản không lấy nhầm.
  const profile = useQuery({ queryKey: ["auth", "me", user?.id], queryFn: authApi.me, enabled: !!user });

  useEffect(() => {
    if (profile.data && profile.data.id === user?.id) setUser(profile.data);
  }, [profile.data, user?.id, setUser]);

  if (profile.error) return <ErrorState title="Không tải được hồ sơ" message={getErrorMessage(profile.error)} />;
  if (!profile.data) return <LoadingState text="Đang tải hồ sơ..." />;

  // key: dựng lại form khi hồ sơ trên máy chủ đổi, để giá trị ban đầu luôn mới.
  return (
    <EditableProfile
      key={`${profile.data.id}-${profile.data.displayName}-${profile.data.avatarUrl}-${profile.data.bio}`}
      profile={profile.data}
      onSaved={(saved) => {
        setUser(saved);
        queryClient.setQueryData(["auth", "me", saved.id], saved);
      }}
    />
  );
}

function EditableProfile({ profile, onSaved }: { profile: UserProfileDto; onSaved: (user: UserProfileDto) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const initial = toValues(profile);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: initial });
  const [displayName, avatarUrl] = useWatch({ control, name: ["displayName", "avatarUrl"] });

  const save = useMutation({
    mutationFn: (patch: UpdateProfileRequest) => authApi.updateProfile(patch),
    onSuccess: (saved) => {
      onSaved(saved);
      toast.success("Đã lưu hồ sơ");
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["displayName", "avatarUrl", "bio"])),
  });

  function onSubmit(values: ProfileValues) {
    setFormError(null);
    const patch = profilePatch(initial, values);
    if (Object.keys(patch).length > 0) save.mutate(patch);
  }

  const previewName = displayName?.trim() || profile.displayName;
  const previewAvatar = /^https?:\/\//i.test(avatarUrl ?? "") ? avatarUrl : null;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {previewAvatar && <AvatarImage src={previewAvatar} alt={previewName} />}
            <AvatarFallback className="bg-primary/10 text-lg text-primary">{getInitials(previewName)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle className="text-xl">{previewName}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span>{profile.email}</span>
              {profile.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role === "Admin" ? "Quản trị viên" : "Tác giả"}
                </Badge>
              ))}
              <span className="text-xs">Tham gia {formatDate(profile.createdAt)}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          <FormAlert message={formError} />
          <TextField id="displayName" label="Tên hiển thị" error={errors.displayName?.message} {...register("displayName")} />
          <TextField
            id="avatarUrl"
            label="Ảnh đại diện (địa chỉ URL)"
            placeholder="https://..."
            hint="Để trống để dùng chữ viết tắt của tên."
            error={errors.avatarUrl?.message}
            {...register("avatarUrl")}
          />
          <TextAreaField
            id="bio"
            label="Giới thiệu"
            rows={4}
            placeholder="Vài dòng về bạn và món ăn bạn yêu thích"
            error={errors.bio?.message}
            {...register("bio")}
          />
        </CardContent>
        <CardFooter className="mt-6 justify-end gap-2">
          <Button type="button" variant="outline" disabled={!isDirty || save.isPending} onClick={() => reset(initial)}>
            Hoàn tác
          </Button>
          <Button type="submit" disabled={!isDirty || save.isPending}>
            {save.isPending && <Spinner className="text-primary-foreground" />} Lưu thay đổi
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
