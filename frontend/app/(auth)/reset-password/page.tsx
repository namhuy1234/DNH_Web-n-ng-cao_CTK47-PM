import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { LoadingState } from "@/components/common/Loading";

// Trang chứa token bí mật trên URL: không cho máy tìm kiếm lưu và không gửi Referer ra ngoài.
export const metadata: Metadata = { title: "Đặt mật khẩu mới", robots: { index: false }, referrer: "no-referrer" };

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordContent({ searchParams }: Pick<PageProps<"/reset-password">, "searchParams">) {
  const params = await searchParams;
  const read = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  return <ResetPasswordForm email={read(params.email)} token={read(params.token)} />;
}
