"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { StoreHydration } from "@/components/common/StoreHydration";
import { Toaster } from "@/components/ui/sonner";
import { getQueryClient } from "@/lib/query/get-query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={getQueryClient()}>
      <StoreHydration />
      {children}
      {/* Thông báo dạng toast dùng chung cho cả ứng dụng */}
      <Toaster position="top-right" richColors closeButton />
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
    </ThemeProvider>
  );
}
