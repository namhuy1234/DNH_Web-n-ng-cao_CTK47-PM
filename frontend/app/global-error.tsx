"use client";

import "./globals.css";

/** Bắt lỗi ngay ở root layout nên phải tự khai báo <html> và <body>. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 font-sans">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold">Ứng dụng gặp sự cố</h1>
          <p className="text-muted-foreground">Rất tiếc, đã có lỗi nghiêm trọng xảy ra. Vui lòng thử lại.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
