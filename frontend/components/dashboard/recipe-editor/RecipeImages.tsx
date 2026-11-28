"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Star, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getErrorMessage } from "@/lib/api/errors";
import { manageApi } from "@/lib/api/manage";
import { checkImageFile, IMAGE_ACCEPT } from "@/lib/image-file";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { ImageDto } from "@/types";
import { usePublicCacheRefresh } from "../shared";

interface Upload {
  key: string;
  name: string;
  preview: string;
  progress: number;
  error?: string;
}

interface RecipeImagesProps {
  recipeId: string;
  title: string;
  images: ImageDto[];
  /** Gọi sau mỗi thay đổi để trang đọc lại công thức (rowVersion mới). */
  onChanged: () => Promise<unknown>;
}

/** Quản lý ảnh công thức: kéo thả tải lên, đặt ảnh chính, sửa mô tả ảnh, xóa ảnh. */
export function RecipeImages({ recipeId, title, images, onChanged }: RecipeImagesProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const refreshCache = usePublicCacheRefresh();
  const sorted = [...images].sort((a, b) => a.orderIndex - b.orderIndex);

  // Giải phóng URL xem trước khi rời trang.
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const patch = (key: string, change: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...change } : u)));

  async function uploadAll(files: FileList | File[]) {
    // Tải lần lượt từng ảnh: giới hạn tần suất upload của API là vài ảnh mỗi phút.
    for (const file of Array.from(files)) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      const preview = URL.createObjectURL(file);
      previews.current.push(preview);
      const problem = checkImageFile(file);
      setUploads((list) => [...list, { key, name: file.name, preview, progress: 0, error: problem ?? undefined }]);
      if (problem) continue;

      try {
        // Mô tả ảnh mặc định là tên món, giúp trình đọc màn hình và SEO.
        await manageApi.uploadImage(recipeId, file, title, (progress) => patch(key, { progress }));
        setUploads((list) => list.filter((u) => u.key !== key));
        await onChanged();
        refreshCache();
      } catch (error) {
        patch(key, { error: getErrorMessage(error) });
      }
    }
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      await onChanged();
      refreshCache();
      toast.success(success);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ảnh món ăn</CardTitle>
        <CardDescription>JPEG, PNG, WebP hoặc AVIF, tối đa 5 MB mỗi ảnh. Ảnh có ngôi sao là ảnh bìa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void uploadAll(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-accent/40",
            dragging && "border-primary bg-accent/60",
          )}
        >
          <ImagePlus className="size-8 text-primary" />
          <span>
            <span className="font-medium text-foreground">Bấm để chọn ảnh</span> hoặc kéo thả ảnh vào đây
          </span>
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="sr-only"
          data-testid="image-input"
          onChange={(e) => {
            if (e.target.files) void uploadAll(e.target.files);
            e.target.value = ""; // chọn lại đúng file đó vẫn kích hoạt onChange
          }}
        />

        {uploads.length > 0 && (
          <ul className="space-y-2" aria-label="Ảnh đang tải lên">
            {uploads.map((u) => (
              <li key={u.key} className="flex items-center gap-3 rounded-lg border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước dạng blob: */}
                <img src={u.preview} alt="" className="size-12 rounded object-cover" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  {u.error ? (
                    <p className="flex items-center gap-1 text-sm text-destructive">
                      <TriangleAlert className="size-4 shrink-0" /> {u.error}
                    </p>
                  ) : (
                    <Progress value={u.progress} aria-label={`Đang tải ${u.name}`} />
                  )}
                </div>
                {u.error && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setUploads((l) => l.filter((x) => x.key !== u.key))}>
                    Bỏ qua
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có ảnh nào. Bài có ảnh thu hút người đọc hơn nhiều.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Ảnh đã tải lên">
            {sorted.map((image) => (
              <ImageCard key={image.id} recipeId={recipeId} image={image} run={run} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ImageCard({
  recipeId,
  image,
  run,
}: {
  recipeId: string;
  image: ImageDto;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [alt, setAlt] = useState(image.altText ?? "");

  return (
    <li className={cn("overflow-hidden rounded-xl border bg-card", image.isPrimary && "ring-2 ring-primary")} data-testid="image-card">
      <div className="relative aspect-[4/3] bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh từ máy chủ API, kích thước không cố định */}
        <img src={mediaUrl(image.originalUrl) ?? ""} alt={image.altText ?? ""} className="size-full object-cover" />
        {image.isPrimary && (
          <Badge className="absolute top-2 left-2 gap-1">
            <Star className="size-3 fill-current" /> Ảnh bìa
          </Badge>
        )}
      </div>
      <div className="space-y-2 p-3">
        <Input
          value={alt}
          maxLength={200}
          aria-label="Mô tả ảnh"
          placeholder="Mô tả ảnh"
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => {
            if (alt !== (image.altText ?? ""))
              void run(() => manageApi.updateImage(recipeId, image.id, { altText: alt }), "Đã lưu mô tả ảnh").catch(() => {});
          }}
        />
        <div className="flex items-center gap-2">
          {!image.isPrimary && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-w-0 flex-1"
              onClick={() =>
                void run(() => manageApi.updateImage(recipeId, image.id, { isPrimary: true }), "Đã đặt làm ảnh bìa").catch(() => {})
              }
            >
              <Star /> Đặt làm ảnh bìa
            </Button>
          )}
          <ConfirmDialog
            trigger={
              <Button type="button" size="icon-sm" variant="ghost" className="ml-auto shrink-0 text-destructive" aria-label="Xóa ảnh">
                <Trash2 />
              </Button>
            }
            title="Xóa ảnh này?"
            description="Ảnh bị xóa hẳn khỏi máy chủ. Nếu là ảnh bìa, ảnh kế tiếp sẽ thành ảnh bìa."
            confirmText="Xóa ảnh"
            destructive
            onConfirm={() => run(() => manageApi.deleteImage(recipeId, image.id), "Đã xóa ảnh")}
          />
        </div>
      </div>
    </li>
  );
}
