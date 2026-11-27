"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">Đã có lỗi xảy ra</h1>
      <p className="mb-6 text-gray-500">Không hiển thị được trang này. Vui lòng thử lại.</p>
      <button type="button" onClick={reset} className="rounded-lg bg-orange-600 px-4 py-2 text-white">
        Thử lại
      </button>
    </main>
  );
}
