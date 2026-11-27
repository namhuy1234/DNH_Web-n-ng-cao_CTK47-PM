import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Inter có bộ ký tự tiếng Việt; biến --font-inter được globals.css dùng làm font-sans.
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Culinary Blog — Ẩm thực Việt", template: "%s | Culinary Blog" },
  description: "Chia sẻ và khám phá công thức nấu ăn",
  openGraph: { type: "website", locale: "vi_VN", siteName: "Culinary Blog" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
