"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api/errors";

/** Error boundary chung; retry() tải lại dữ liệu của đoạn trang bị lỗi (Next.js 16.3+). */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container mx-auto px-4 py-20">
      <ErrorState
        title="Không hiển thị được trang này"
        // Lỗi từ Server Component có digest; ở production Next.js thay message bằng câu tiếng Anh
        // chung chung (không lộ chi tiết), nên hiện câu tiếng Việt và giữ mã lỗi để tra log.
        message={error.digest ? "Máy chủ gặp sự cố khi hiển thị trang. Vui lòng thử lại sau." : getErrorMessage(error)}
        action={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => retry()}>
              <RotateCcw /> Thử lại
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/">Về trang chủ</Link>
            </Button>
          </div>
        }
      />
      {error.digest && <p className="mt-4 text-center text-xs text-muted-foreground">Mã lỗi: {error.digest}</p>}
    </main>
  );
}
