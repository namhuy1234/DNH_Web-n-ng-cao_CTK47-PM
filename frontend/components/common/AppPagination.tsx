import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getPageItems } from "@/lib/pagination";
import { cn } from "@/lib/utils";

interface AppPaginationProps {
  page: number;
  totalPages: number;
  /** Đường dẫn trang hiện tại, ví dụ "/recipes". */
  basePath: string;
  /** Các tham số khác cần giữ lại khi đổi trang (bộ lọc, từ khóa...). */
  searchParams?: Record<string, string | undefined>;
  className?: string;
}

/**
 * Phân trang qua URL (?page=2) nên chia sẻ được đường dẫn và dùng được nút Back.
 * Không cần "use client": mỗi trang là một liên kết.
 */
export function AppPagination({ page, totalPages, basePath, searchParams = {}, className }: AppPaginationProps) {
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const disabled = "pointer-events-none opacity-50";

  return (
    <Pagination className={cn("mt-10", className)}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={hrefFor(page - 1)}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
            className={cn(page <= 1 && disabled)}
          />
        </PaginationItem>

        {getPageItems(page, totalPages).map((item, index) =>
          item === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink href={hrefFor(item)} isActive={item === page}>
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href={hrefFor(page + 1)}
            aria-disabled={page >= totalPages}
            tabIndex={page >= totalPages ? -1 : undefined}
            className={cn(page >= totalPages && disabled)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
