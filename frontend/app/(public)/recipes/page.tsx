import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Công thức" };

export default function RecipesPage() {
  return <PagePlaceholder title="Công thức" note="Danh sách công thức, làm ở Lab 7." />;
}
