"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIFFICULTY_LABELS } from "@/lib/format";
import type { RecipeFilterValues } from "@/lib/recipe-search";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Mới nhất" },
  { value: "createdAt", label: "Cũ nhất" },
  { value: "cookTime", label: "Nấu nhanh nhất" },
  { value: "title", label: "Tên A → Z" },
] as const;

const ALL = "all";

interface RecipeFiltersProps {
  /** Trang nhận bộ lọc (GET), ví dụ "/recipes" hoặc "/recipes/search". */
  action: string;
  categories: { id: string; name: string }[];
  initial?: Partial<RecipeFilterValues>;
  showKeyword?: boolean;
  showSort?: boolean;
}

/**
 * Thanh lọc gửi GET tới trang đích; giá trị nằm trên URL nên chia sẻ và Back được.
 * Nhãn của Select được ghi rõ vì Radix chưa biết nhãn của mục đã chọn trước khi mở danh sách.
 */
export function RecipeFilters({ action, categories, initial, showKeyword = false, showSort = false }: RecipeFiltersProps) {
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? ALL);
  const [difficulty, setDifficulty] = useState<string>(initial?.difficulty ?? ALL);
  const [sort, setSort] = useState<string>(initial?.sort ?? "-createdAt");

  const categoryLabel = categories.find((c) => c.id === categoryId)?.name ?? "Mọi danh mục";
  const difficultyLabel =
    difficulty === ALL ? "Mọi độ khó" : DIFFICULTY_LABELS[difficulty as keyof typeof DIFFICULTY_LABELS];
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Mới nhất";

  return (
    <form
      action={action}
      role="search"
      className={cn(
        "mb-6 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2",
        showKeyword ? "lg:grid-cols-[1fr_200px_160px_auto]" : "lg:grid-cols-[200px_160px_180px_auto] lg:justify-start",
      )}
    >
      {showKeyword && (
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            defaultValue={initial?.q}
            maxLength={100}
            placeholder="Tên món, nguyên liệu... (gõ không dấu cũng được)"
            className="pl-8"
            aria-label="Từ khóa"
          />
        </div>
      )}
      <Select name="categoryId" value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger className="w-full" aria-label="Danh mục">
          <SelectValue>{categoryLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Mọi danh mục</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select name="difficulty" value={difficulty} onValueChange={setDifficulty}>
        <SelectTrigger className="w-full" aria-label="Độ khó">
          <SelectValue>{difficultyLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Mọi độ khó</SelectItem>
          {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showSort && (
        <Select name="sort" value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full" aria-label="Sắp xếp">
            <SelectValue>Sắp xếp: {sortLabel.toLowerCase()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button type="submit">{showKeyword ? "Tìm" : "Lọc"}</Button>
    </form>
  );
}
