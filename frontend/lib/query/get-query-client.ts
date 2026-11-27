import { QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
    },
  });
}

let browserClient: QueryClient | undefined;

/** Server tạo mới cho mỗi request; trình duyệt dùng chung một client. */
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  return (browserClient ??= makeQueryClient());
}
