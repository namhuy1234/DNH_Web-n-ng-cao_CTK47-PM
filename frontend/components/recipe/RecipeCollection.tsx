"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUIStore, useViewMode, type ViewMode } from "@/store/ui-store";

/** Nút chuyển lưới/danh sách; lựa chọn được nhớ qua ui-store (persist). */
export function ViewModeToggle() {
  const mode = useViewMode();
  const setMode = useUIStore((s) => s.setRecipesViewMode);

  const options: { value: ViewMode; label: string; icon: typeof List }[] = [
    { value: "grid", label: "Dạng lưới", icon: LayoutGrid },
    { value: "list", label: "Dạng danh sách", icon: List },
  ];

  return (
    <div className="flex rounded-lg border p-0.5" role="group" aria-label="Cách hiển thị">
      {options.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={mode === value ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label={label}
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
        >
          <Icon />
        </Button>
      ))}
    </div>
  );
}

/**
 * Bọc danh sách thẻ (render sẵn ở server, truyền qua children) và chỉ đổi
 * cách xếp theo view mode, nên thẻ công thức vẫn là Server Component.
 */
export function RecipeCollection({ children, columns = 4 }: { children: React.ReactNode; columns?: 3 | 4 }) {
  const mode = useViewMode();
  return (
    <div
      data-view={mode}
      className={cn("grid gap-6", mode === "grid" ? (columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4") : "grid-cols-1 sm:[&>[data-slot=card]]:flex-row sm:[&_[data-cover]]:aspect-auto sm:[&_[data-cover]]:w-56 sm:[&_[data-cover]]:shrink-0")}
    >
      {children}
    </div>
  );
}
