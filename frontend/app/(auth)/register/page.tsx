import type { Metadata } from "next";
import { GuestOnly } from "@/components/auth/GuestOnly";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Đăng ký" };

export default function RegisterPage() {
  return (
    <GuestOnly>
      <RegisterForm />
    </GuestOnly>
  );
}
