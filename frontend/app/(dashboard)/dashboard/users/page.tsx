import type { Metadata } from "next";
import { RequireAdmin } from "@/components/dashboard/shared";
import { UsersAdmin } from "@/components/dashboard/UsersAdmin";
import { PageHeader } from "@/components/layout/PageHeader";

// Nội dung phụ thuộc trạng thái đăng nhập ở trình duyệt nên không dựng sẵn App Shell.
export const instant = false;

export const metadata: Metadata = { title: "Người dùng" };

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Người dùng" description="Quản trị viên và tác giả của Culinary Blog. Khóa tài khoản có hiệu lực ngay lập tức." />
      <RequireAdmin>
        <UsersAdmin />
      </RequireAdmin>
    </>
  );
}
