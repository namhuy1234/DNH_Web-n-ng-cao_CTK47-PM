import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/dashboard/ChangePasswordForm";
import { PageHeader } from "@/components/layout/PageHeader";

// Nội dung phụ thuộc trạng thái đăng nhập ở trình duyệt nên không dựng sẵn App Shell.
export const instant = false;

export const metadata: Metadata = { title: "Đổi mật khẩu" };

export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader title="Bảo mật tài khoản" description="Đổi mật khẩu đăng nhập." />
      <ChangePasswordForm />
    </>
  );
}
