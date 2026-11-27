import { CookingPot, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

/** Hiện khi danh sách rỗng hoặc trang không tồn tại. */
export function EmptyState({ title, description, icon: Icon = CookingPot, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center", className)}>
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className="size-7" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6 flex gap-2">{action}</div>}
    </div>
  );
}
