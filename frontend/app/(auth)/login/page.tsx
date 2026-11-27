import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return <PagePlaceholder title="Đăng nhập" note="Biểu mẫu đăng nhập, làm ở Lab 7." />;
}
