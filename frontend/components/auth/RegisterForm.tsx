"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Spinner } from "@/components/common/Loading";
import { FormAlert, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { applyServerErrors } from "@/lib/forms";
import { registerSchema, type RegisterValues } from "@/lib/validation/auth";
import { AuthCard } from "./AuthCard";
import { useSignIn } from "./useSignIn";

export function RegisterForm() {
  const signIn = useSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit({ displayName, email, password }: RegisterValues) {
    setFormError(null);
    try {
      signIn(await authApi.register({ displayName, email, password }));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["displayName", "email", "password"]));
    }
  }

  return (
    <AuthCard
      title="Tạo tài khoản"
      description="Đăng ký để lưu và chia sẻ công thức của bạn."
      footer={
        <>
          Đã có tài khoản?&nbsp;
          <Link href="/login" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormAlert message={formError} />
        <TextField
          id="displayName"
          label="Tên hiển thị"
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          error={errors.displayName?.message}
          {...register("displayName")}
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@vidu.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          id="password"
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          hint="Ít nhất 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt."
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          id="confirmPassword"
          label="Nhập lại mật khẩu"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="text-primary-foreground" />} Đăng ký
        </Button>
      </form>
    </AuthCard>
  );
}
