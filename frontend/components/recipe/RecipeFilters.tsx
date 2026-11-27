"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIFFICULTY_LABELS } from "@/lib/format";
import type { RecipeFilterValues } from "@/lib/recipe-search";

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Mới nhất" },
  { value: "createdAt", label: "Cũ nhất" },
  { value: "cookTime", label: "Nấu nhanh nhất" },
  { value: "title", label: "Tên A → Z" },
] as const;

const ALL = "all";

/**
 * Thanh lọc gửi GET tới /recipes/search, giữ lại giá trị đang lọc (đọc từ URL).
 * Nhãn của Select được ghi rõ vì Radix chưa biết nhãn của mục đã chọn trước khi mở danh sách.
 */
export function RecipeFilters({ initial }: { initial?: Partial<RecipeFilterValues> }) {
  const [difficulty, setDifficulty] = useState<string>(initial?.difficulty ?? ALL);
  const [sort, setSort] = useState<string>(initial?.sort ?? "-createdAt");

  const difficultyLabel = difficulty === ALL ? "Mọi độ khó" : DIFFICULTY_LABELS[difficulty as keyof typeof DIFFICULTY_LABELS];
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Mới nhất";

  return (
    <form action="/recipes/search" className="mb-6 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={initial?.q}
          maxLength={100}
          placeholder="Tìm theo tên món..."
          className="pl-8"
          aria-label="Từ khóa"
        />
      </div>
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
      <Button type="submit">Lọc</Button>
    </form>
  );
}
