import { RecipeGridSkeleton } from "@/components/common/Loading";
import { Skeleton } from "@/components/ui/skeleton";

/** Next.js tự bọc page trong Suspense và hiện khung này khi chuyển trang. */
export default function RecipesLoading() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <RecipeGridSkeleton />
    </div>
  );
}
