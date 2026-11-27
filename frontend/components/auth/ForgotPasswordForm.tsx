"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";
import { Spinner } from "@/components/common/Loading";
import { FormAlert, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { applyServerErrors } from "@/lib/forms";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation/auth";
import { AuthCard } from "./AuthCard";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);
    try {
      await authApi.forgotPassword(values);
      setSentTo(values.email);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["email"]));
    }
  }

  const back = (
    <Link href="/login" className="font-medium text-primary hover:underline">
      ← Quay lại đăng nhập
    </Link>
  );

  if (sentTo) {
    return (
      <AuthCard title="Kiểm tra hộp thư" description="Yêu cầu đặt lại mật khẩu đã được ghi nhận." footer={back}>
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-10 text-primary" />
          {/* Cùng một câu cho mọi email để không lộ email nào đã đăng ký */}
          <p className="text-sm text-muted-foreground">
            Nếu <span className="font-medium text-foreground">{sentTo}</span> đã đăng ký, bạn sẽ nhận được email kèm
            liên kết đặt lại mật khẩu. Liên kết có hiệu lực 30 phút.
          </p>
          <Button variant="outline" size="sm" onClick={() => setSentTo(null)}>
            Gửi với email khác
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Quên mật khẩu"
      description="Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
      footer={back}
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
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="text-primary-foreground" />} Gửi liên kết
        </Button>
      </form>
    </AuthCard>
  );
}
