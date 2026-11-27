import type { Metadata } from "next";
import { GuestOnly } from "@/components/auth/GuestOnly";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <GuestOnly>
      <LoginForm />
    </GuestOnly>
  );
}
