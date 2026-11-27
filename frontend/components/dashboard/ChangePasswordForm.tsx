"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Spinner } from "@/components/common/Loading";
import { FormAlert, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import { applyServerErrors } from "@/lib/forms";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/validation/auth";
import { useAuthStore } from "@/store/auth-store";

const EMPTY: ChangePasswordValues = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePasswordForm() {
  const setSession = useAuthStore((s) => s.setSession);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: EMPTY });

  async function onSubmit({ currentPassword, newPassword }: ChangePasswordValues) {
    setFormError(null);
    try {
      // Backend thu hồi mọi phiên cũ và trả phiên mới cho thiết bị này.
      setSession(await authApi.changePassword({ currentPassword, newPassword }));
      reset(EMPTY);
      toast.success("Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.");
    } catch (error) {
      // Sai mật khẩu hiện tại (AUTH_WRONG_PASSWORD) thì báo ngay dưới ô đó.
      const code = (error as { code?: string }).code;
      if (code === "AUTH_WRONG_PASSWORD") {
        setError("currentPassword", { type: "server", message: (error as Error).message });
        return;
      }
      setFormError(applyServerErrors(error, setError, ["currentPassword", "newPassword"]));
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Đổi mật khẩu</CardTitle>
        <CardDescription>Sau khi đổi, mọi thiết bị khác sẽ phải đăng nhập lại.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          <FormAlert message={formError} />
          <TextField
            id="currentPassword"
            label="Mật khẩu hiện tại"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <TextField
            id="newPassword"
            label="Mật khẩu mới"
            type="password"
            autoComplete="new-password"
            hint="Ít nhất 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt."
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <TextField
            id="confirmPassword"
            label="Nhập lại mật khẩu mới"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </CardContent>
        <CardFooter className="mt-6 justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="text-primary-foreground" />} Đổi mật khẩu
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
