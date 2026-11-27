import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Trang quản lý" };

export default function DashboardPage() {
  return <PagePlaceholder title="Trang quản lý" note="Quản lý công thức, làm ở Lab 8." />;
}
