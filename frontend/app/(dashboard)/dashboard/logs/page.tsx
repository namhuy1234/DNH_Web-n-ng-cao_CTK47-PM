import type { Metadata } from "next";
import { RequireAdmin } from "@/components/dashboard/shared";
import { SystemLogs } from "@/components/dashboard/SystemLogs";
import { PageHeader } from "@/components/layout/PageHeader";

// Nội dung phụ thuộc trạng thái đăng nhập ở trình duyệt nên không dựng sẵn App Shell.
export const instant = false;

export const metadata: Metadata = { title: "Nhật ký hệ thống" };

export default function LogsPage() {
  return (
    <>
      <PageHeader
        title="Nhật ký hệ thống"
        description="Mỗi yêu cầu HTTP, thao tác thay đổi dữ liệu và lỗi đều được Serilog ghi lại kèm mã yêu cầu và người thực hiện."
      />
      <RequireAdmin>
        <SystemLogs />
      </RequireAdmin>
    </>
  );
}
