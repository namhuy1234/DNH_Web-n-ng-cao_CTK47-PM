import type { Metadata } from "next";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { PageHeader } from "@/components/layout/PageHeader";

// Nội dung bị RequireAuth (kiểm tra ở trình duyệt) giữ lại tới khi biết trạng thái đăng nhập,
// nên không thể dựng sẵn App Shell để chuyển trang tức thì. Lab 7 chuyển sang proxy.ts.
export const instant = false;

export const metadata: Metadata = { title: "Hồ sơ" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Hồ sơ cá nhân" description="Thông tin tài khoản lấy từ auth-store." />
      <ProfileCard />
    </>
  );
}
