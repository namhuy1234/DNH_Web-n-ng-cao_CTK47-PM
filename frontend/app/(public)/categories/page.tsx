import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Danh mục" };

export default function CategoriesPage() {
  return <PagePlaceholder title="Danh mục" note="Danh sách danh mục, làm ở Lab 7." />;
}
