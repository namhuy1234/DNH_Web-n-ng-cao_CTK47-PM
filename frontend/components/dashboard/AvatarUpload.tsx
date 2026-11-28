"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/common/Loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api/errors";
import { avatarApi } from "@/lib/api/manage";
import { getInitials } from "@/lib/format";
import { checkImageFile, IMAGE_ACCEPT } from "@/lib/image-file";
import { mediaUrl } from "@/lib/media";
import { useAuthStore } from "@/store/auth-store";
import type { UserProfileDto } from "@/types";

/** Ảnh đại diện có nút đổi ảnh: chọn file, kiểm tra ở trình duyệt, tải lên kèm tiến độ. */
export function AvatarUpload({ profile, previewName }: { profile: UserProfileDto; previewName: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: (file: File) => avatarApi.upload(file, setProgress),
    onMutate: () => setProgress(0),
    onSuccess: (saved) => {
      setUser(saved);
      queryClient.setQueryData(["auth", "me", saved.id], saved);
      toast.success("Đã đổi ảnh đại diện");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function choose(file: File | undefined) {
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    upload.mutate(file);
  }

  const src = mediaUrl(profile.avatarUrl);

  return (
    <div className="relative shrink-0">
      <Avatar className="size-20">
        {src && <AvatarImage src={src} alt={previewName} />}
        <AvatarFallback className="bg-primary/10 text-xl text-primary">{getInitials(previewName)}</AvatarFallback>
      </Avatar>
      {upload.isPending && (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-medium text-white">
          {progress}%
        </span>
      )}
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        className="absolute -right-1 -bottom-1 rounded-full border shadow"
        aria-label="Đổi ảnh đại diện"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? <Spinner /> : <Camera />}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        data-testid="avatar-input"
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
