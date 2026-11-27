"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/common/Loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { getErrorMessage, getFieldErrors } from "@/lib/api/errors";
import { safeRedirect } from "@/lib/navigation";
import { useAuthStore } from "@/store/auth-store";

type Mode = "login" | "register";

const TEXT = {
  login: {
    title: "Đăng nhập",
    description: "Chào mừng bạn quay lại bếp!",
    submit: "Đăng nhập",
    switchText: "Chưa có tài khoản?",
    switchLink: { href: "/register", label: "Đăng ký" },
  },
  register: {
    title: "Tạo tài khoản",
    description: "Đăng ký để lưu và chia sẻ công thức của bạn.",
    submit: "Đăng ký",
    switchText: "Đã có tài khoản?",
    switchLink: { href: "/login", label: "Đăng nhập" },
  },
} as const;

/**
 * Form đăng nhập/đăng ký. Lab 6 dùng để kiểm chứng lớp gọi API và auth-store;
 * Lab 7 chuyển sang React Hook Form + Zod.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const text = TEXT[mode];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const auth =
        mode === "login"
          ? await authApi.login({ email, password })
          : await authApi.register({ email, password, displayName: String(form.get("displayName") ?? "").trim() });
      // Bỏ dữ liệu của phiên trước (nếu có) để không lẫn sang tài khoản mới.
      queryClient.removeQueries({ queryKey: ["auth"] });
      setSession(auth);
      toast.success(`Xin chào, ${auth.user.displayName}!`);
      // Quay về trang đã yêu cầu đăng nhập; chỉ nhận đường dẫn nội bộ.
      router.push(safeRedirect(new URLSearchParams(window.location.search).get("redirect")));
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{text.title}</CardTitle>
        <CardDescription>{text.description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {mode === "register" && (
            <Field id="displayName" label="Tên hiển thị" placeholder="Nguyễn Văn A" autoComplete="name" error={fieldErrors.displayName} />
          )}
          <Field id="email" label="Email" type="email" placeholder="ban@vidu.com" autoComplete="email" error={fieldErrors.email} />
          <Field
            id="password"
            label="Mật khẩu"
            type="password"
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            error={fieldErrors.password}
            hint={mode === "register" ? "Ít nhất 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt." : undefined}
          />
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-4">
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Spinner className="text-primary-foreground" />}
            {text.submit}
          </Button>
          <p className="text-sm text-muted-foreground">
            {text.switchText}{" "}
            <Link href={text.switchLink.href} className="font-medium text-primary hover:underline">
              {text.switchLink.label}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

interface FieldProps extends React.ComponentProps<"input"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

function Field({ id, label, error, hint, ...props }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        {...props}
      />
      {(error || hint) && (
        <p id={`${id}-msg`} className={error ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
