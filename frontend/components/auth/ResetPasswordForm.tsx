"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Spinner } from "@/components/common/Loading";
import { FormAlert, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { applyServerErrors } from "@/lib/forms";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation/auth";
import { useAuthStore } from "@/store/auth-store";
import { AuthCard } from "./AuthCard";

/** Đặt mật khẩu mới bằng email và token lấy từ liên kết trong email. */
export function ResetPasswordForm({ email, token }: { email: string; token: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const footer = (
    <Link href="/forgot-password" className="font-medium text-primary hover:underline">
      Gửi lại liên kết mới
    </Link>
  );

  if (!email || !token) {
    return (
      <AuthCard title="Liên kết không hợp lệ" description="Liên kết đặt lại mật khẩu bị thiếu thông tin." footer={footer}>
        <FormAlert message="Hãy mở đúng liên kết trong email, hoặc gửi yêu cầu mới." />
      </AuthCard>
    );
  }

  async function onSubmit({ newPassword }: ResetPasswordValues) {
    setFormError(null);
    try {
      await authApi.resetPassword({ email, token, newPassword });
      // Backend đã thu hồi mọi phiên cũ; xóa luôn phiên trong trình duyệt này.
      useAuthStore.getState().clearSession();
      toast.success("Đã đặt mật khẩu mới. Hãy đăng nhập lại.");
      router.replace("/login");
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["newPassword"]));
    }
  }

  return (
    <AuthCard title="Đặt mật khẩu mới" description={`Cho tài khoản ${email}`} footer={footer}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormAlert message={formError} />
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
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="text-primary-foreground" />} Đặt mật khẩu mới
        </Button>
      </form>
    </AuthCard>
  );
}
