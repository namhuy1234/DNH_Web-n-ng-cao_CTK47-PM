import type { Metadata } from "next";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { PageHeader } from "@/components/layout/PageHeader";

// Nội dung phụ thuộc trạng thái đăng nhập ở trình duyệt nên không dựng sẵn App Shell.
export const instant = false;

export const metadata: Metadata = { title: "Hồ sơ" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Hồ sơ cá nhân" description="Cập nhật tên hiển thị, ảnh đại diện và lời giới thiệu." />
      <ProfileForm />
    </>
  );
}
