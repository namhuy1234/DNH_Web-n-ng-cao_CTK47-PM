import { Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("size-5 animate-spin text-primary", className)} />;
}

/** Vòng xoay kèm chữ, dùng khi chưa biết trước hình dạng nội dung. */
export function LoadingState({ text = "Đang tải...", className }: { text?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-3 py-16 text-muted-foreground", className)}>
      <Spinner />
      <span>{text}</span>
    </div>
  );
}

/** Khung xương có cùng kích thước với RecipeCard để trang không bị nhảy khi dữ liệu về. */
export function RecipeCardSkeleton() {
  return (
    <Card className="overflow-hidden pt-0">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent />
      <CardFooter className="gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </CardFooter>
    </Card>
  );
}

export function RecipeGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-label="Đang tải công thức" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}
