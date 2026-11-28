import type { RecipeStatus, RecipeStatusAction } from "@/types";

/*
 * Vòng đời công thức (SRS FR-RCP-005, 006, 007):
 *   Draft ──đăng──▶ Published ──lưu trữ──▶ Archived
 *     ▲                │  gỡ về nháp           │ đăng lại / về nháp
 *     └────────────────┴───────────────────────┘
 *   Mọi trạng thái ──xóa (mềm)──▶ Deleted ──khôi phục──▶ Draft
 */

export type RecipeAction = RecipeStatusAction | "delete";

export interface ActionInfo {
  action: RecipeAction;
  label: string;
  /** Thông báo sau khi làm xong. */
  done: string;
  destructive?: boolean;
}

const INFO: Record<RecipeAction, Omit<ActionInfo, "action" | "label">> = {
  publish: { done: "Đã đăng công thức" },
  unpublish: { done: "Đã đưa về bản nháp" },
  archive: { done: "Đã lưu trữ công thức" },
  restore: { done: "Đã khôi phục về bản nháp" },
  delete: { done: "Đã xóa công thức", destructive: true },
};

/** Các thao tác hợp lệ theo trạng thái hiện tại, theo thứ tự nên hiện trên giao diện. */
export function availableActions(status: RecipeStatus, deleted = false): ActionInfo[] {
  const make = (action: RecipeAction, label: string): ActionInfo => ({ action, label, ...INFO[action] });

  if (deleted) return [make("restore", "Khôi phục")];

  switch (status) {
    case "Draft":
      return [make("publish", "Đăng bài"), make("delete", "Xóa")];
    case "Published":
      return [make("unpublish", "Gỡ về nháp"), make("archive", "Lưu trữ"), make("delete", "Xóa")];
    case "Archived":
      return [make("publish", "Đăng lại"), make("unpublish", "Đưa về nháp"), make("delete", "Xóa")];
  }
}
