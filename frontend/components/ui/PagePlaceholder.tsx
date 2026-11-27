import Link from "next/link";

export function PagePlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">{title}</h1>
      <p className="mb-6 text-gray-500">{note}</p>
      <Link href="/" className="text-orange-600 underline">Về trang chủ</Link>
    </main>
  );
}
