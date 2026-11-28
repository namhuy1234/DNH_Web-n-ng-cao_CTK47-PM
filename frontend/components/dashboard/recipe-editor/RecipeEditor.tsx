"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileX2, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api/errors";
import { manageApi } from "@/lib/api/manage";
import type { CategoryDto, RecipeDetailDto } from "@/types";
import { RecipeForm } from "./RecipeForm";
import { RecipeImages } from "./RecipeImages";
import { RecipeStatusPanel } from "./RecipeStatusPanel";

/** Trang sửa công thức: ảnh + form bên trái, trạng thái bên phải. */
export function RecipeEditor({ id, categories }: { id: string; categories: CategoryDto[] }) {
  const queryClient = useQueryClient();
  const queryKey = ["manage", "recipe", id];
  const recipe = useQuery({ queryKey, queryFn: () => manageApi.get(id) });
  const [dirty, setDirty] = useState(false);

  if (recipe.error) {
    const error = toApiError(recipe.error);
    const back = (
      <Button asChild variant="outline">
        <Link href="/dashboard/recipes">Về danh sách công thức</Link>
      </Button>
    );
    if (error.status === 404)
      return <EmptyState icon={FileX2} title="Không tìm thấy công thức" description="Bài có thể đã bị xóa. Xem mục Đã xóa để khôi phục." action={back} />;
    if (error.status === 403)
      return <EmptyState icon={ShieldAlert} title="Không có quyền sửa" description="Bạn chỉ sửa được công thức của chính mình." action={back} />;
    return <ErrorState title="Không tải được công thức" message={error.message} action={<Button onClick={() => recipe.refetch()}>Thử lại</Button>} />;
  }
  if (!recipe.data) return <LoadingState text="Đang tải công thức..." />;

  const data = recipe.data;
  const reload = () => recipe.refetch();

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
      <div className="min-w-0 space-y-6">
        <RecipeImages recipeId={data.id} title={data.title} images={data.images} onChanged={reload} />
        <RecipeForm
          categories={categories}
          recipe={data}
          onDirtyChange={setDirty}
          onSaved={(saved: RecipeDetailDto) => queryClient.setQueryData(queryKey, saved)}
          onReload={() => window.location.reload()}
        />
      </div>
      <aside className="xl:sticky xl:top-24 xl:self-start">
        <RecipeStatusPanel recipe={data} dirty={dirty} onChanged={() => void reload()} />
      </aside>
    </div>
  );
}
