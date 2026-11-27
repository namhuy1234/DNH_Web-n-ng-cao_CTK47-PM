import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  /** Nút thử lại hoặc liên kết; truyền vào để component dùng được ở cả server lẫn client. */
  action?: React.ReactNode;
  className?: string;
}

/** Khối báo lỗi thống nhất; message nên lấy từ getErrorMessage(). */
export function ErrorState({ title = "Đã có lỗi xảy ra", message, action, className }: ErrorStateProps) {
  return (
    <Alert variant="destructive" className={cn("mx-auto max-w-xl", className)}>
      <TriangleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </AlertDescription>
    </Alert>
  );
}
