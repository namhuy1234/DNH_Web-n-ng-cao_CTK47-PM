"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleDashed, ExternalLink } from "lucide-react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Spinner } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";
import { publishChecklist } from "@/lib/recipe-form";
import { availableActions, type ActionInfo } from "@/lib/recipe-status";
import { cn } from "@/lib/utils";
import type { RecipeDetailDto } from "@/types";
import { RecipeStatusBadge } from "../shared";
import { useRecipeAction } from "./useRecipeAction";

/** Khung bên phải trang sửa: trạng thái hiện tại, điều kiện đăng bài và các nút chuyển trạng thái. */
export function RecipeStatusPanel({ recipe, dirty, onChanged }: { recipe: RecipeDetailDto; dirty: boolean; onChanged: () => void }) {
  const router = useRouter();
  const mutation = useRecipeAction((info) => {
    if (info.action === "delete") router.push("/dashboard/recipes?status=Deleted");
    else onChanged();
  });
  const checklist = publishChecklist(recipe);
  const canPublish = checklist.every((c) => c.ok || !c.required);

  const runAction = (info: ActionInfo) => mutation.mutateAsync({ id: recipe.id, info });

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          Trạng thái <RecipeStatusBadge status={recipe.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="space-y-1 text-muted-foreground">
          <div className="flex justify-between gap-2">
            <dt>Tác giả</dt>
            <dd className="text-right text-foreground">{recipe.authorName}</dd>
          </div>
          {recipe.publishedAt && (
            <div className="flex justify-between gap-2">
              <dt>Ngày đăng</dt>
              <dd className="text-foreground">{formatDate(recipe.publishedAt)}</dd>
            </div>
          )}
        </dl>

        <ul className="space-y-1.5" aria-label="Điều kiện đăng bài">
          {checklist.map((c) => (
            <li key={c.label} className={cn("flex items-center gap-2", c.ok ? "text-foreground" : "text-muted-foreground")}>
              {c.ok ? <CircleCheck className="size-4 text-emerald-600" /> : <CircleDashed className="size-4" />}
              {c.label}
            </li>
          ))}
        </ul>

        {dirty && <p className="rounded-md bg-amber-50 p-2 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">Hãy lưu thay đổi trước khi đổi trạng thái.</p>}

        <Separator />

        <div className="flex flex-col gap-2">
          {availableActions(recipe.status).map((info) => {
            const disabled = mutation.isPending || dirty || (info.action === "publish" && !canPublish);
            if (info.destructive) {
              return (
                <ConfirmDialog
                  key={info.action}
                  trigger={
                    <Button variant="ghost" className="text-destructive" disabled={mutation.isPending}>
                      {info.label} công thức
                    </Button>
                  }
                  title="Xóa công thức này?"
                  description="Bài sẽ bị ẩn khỏi mọi trang và chuyển vào mục Đã xóa. Bạn có thể khôi phục lại về bản nháp."
                  confirmText="Xóa"
                  destructive
                  onConfirm={() => runAction(info)}
                />
              );
            }
            return (
              <Button
                key={info.action}
                variant={info.action === "publish" ? "default" : "outline"}
                disabled={disabled}
                onClick={() => void runAction(info).catch(() => {})}
              >
                {mutation.isPending && mutation.variables?.info.action === info.action && <Spinner className="text-current" />}
                {info.label}
              </Button>
            );
          })}
          {recipe.status === "Published" && (
            <Button asChild variant="link" className="justify-start px-0">
              <Link href={`/recipes/${recipe.slug}`} target="_blank">
                <ExternalLink /> Xem bài trên trang công khai
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
