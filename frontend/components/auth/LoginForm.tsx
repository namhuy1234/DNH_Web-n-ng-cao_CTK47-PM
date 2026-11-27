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
import { loginSchema, type LoginValues } from "@/lib/validation/auth";
import { AuthCard } from "./AuthCard";
import { useSignIn } from "./useSignIn";

export function LoginForm() {
  const signIn = useSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      signIn(await authApi.login(values));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["email", "password"]));
    }
  }

  return (
    <AuthCard
      title="Đăng nhập"
      description="Chào mừng bạn quay lại bếp!"
      footer={
        <>
          Chưa có tài khoản?&nbsp;
          <Link href="/register" className="font-medium text-primary hover:underline">
            Đăng ký
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormAlert message={formError} />
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="text-right text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="text-primary-foreground" />} Đăng nhập
        </Button>
      </form>
    </AuthCard>
  );
}
