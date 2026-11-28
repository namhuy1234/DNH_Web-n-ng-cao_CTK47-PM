"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/errors";
import { manageApi } from "@/lib/api/manage";
import type { ActionInfo } from "@/lib/recipe-status";
import { usePublicCacheRefresh } from "../shared";

/** Đổi trạng thái hoặc xóa công thức, sau đó làm mới danh sách quản lý và cache trang công khai. */
export function useRecipeAction(onDone?: (info: ActionInfo) => void) {
  const queryClient = useQueryClient();
  const refreshCache = usePublicCacheRefresh();

  return useMutation({
    mutationFn: async ({ id, info }: { id: string; info: ActionInfo }) => {
      if (info.action === "delete") await manageApi.remove(id);
      else await manageApi.changeStatus(id, info.action);
      return info;
    },
    onSuccess: (info) => {
      toast.success(info.done);
      void queryClient.invalidateQueries({ queryKey: ["manage"] });
      refreshCache();
      onDone?.(info);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
