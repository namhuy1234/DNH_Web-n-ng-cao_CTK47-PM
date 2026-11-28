"use client";

import { useState } from "react";
import { Spinner } from "@/components/common/Loading";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  /** Nút mở hộp thoại (phải nhận được ref, ví dụ <Button>). Bỏ trống khi tự điều khiển bằng open. */
  trigger?: React.ReactNode;
  /** Điều khiển từ bên ngoài, ví dụ mở từ một mục trong menu thả xuống. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmText: string;
  destructive?: boolean;
  /** Hộp thoại đóng khi hàm chạy xong; lỗi thì để nguyên cho người dùng thử lại hoặc hủy. */
  onConfirm: () => Promise<unknown>;
}

/** Hỏi lại trước thao tác khó hoàn tác: xóa bài, khóa tài khoản... */
export function ConfirmDialog({ trigger, open, onOpenChange, title, description, confirmText, destructive, onConfirm }: ConfirmDialogProps) {
  const [innerOpen, setInnerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = (next: boolean) => {
    if (busy) return; // đang chạy thì không cho đóng giữa chừng
    setInnerOpen(next);
    onOpenChange?.(next);
  };

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      setBusy(false);
      setInnerOpen(false);
      onOpenChange?.(false);
    } catch {
      // Nơi gọi đã báo lỗi bằng toast.
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
          {/* Không dùng AlertDialogAction vì nó tự đóng trước khi thao tác xong. */}
          <Button variant={destructive ? "destructive" : "default"} disabled={busy} onClick={confirm}>
            {busy && <Spinner className="text-current" />} {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
