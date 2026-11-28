"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, ScrollText, Search, X } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/api/errors";
import { logsApi } from "@/lib/api/manage";
import { formatBytes } from "@/lib/image-file";
import { cn } from "@/lib/utils";
import type { LogEntryDto, LogLevel, LogQuery } from "@/types";

const LEVELS: { value: LogLevel | "all"; label: string }[] = [
  { value: "all", label: "Mọi mức" },
  { value: "Debug", label: "Debug trở lên" },
  { value: "Information", label: "Information trở lên" },
  { value: "Warning", label: "Warning trở lên" },
  { value: "Error", label: "Chỉ lỗi" },
];

const LEVEL_STYLE: Record<LogLevel, string> = {
  Verbose: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  Debug: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  Information: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
  Warning: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  Error: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
  Fatal: "bg-red-600 text-white",
};

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Ho_Chi_Minh",
});

/** Trang xem nhật ký hệ thống (Serilog ghi ra file JSON) dành cho quản trị viên. */
export function SystemLogs() {
  const [date, setDate] = useState<string | undefined>();
  const [level, setLevel] = useState<LogLevel | "all">("Information");
  const [keyword, setKeyword] = useState("");
  const [q, setQ] = useState("");
  const [take, setTake] = useState(200);
  const [live, setLive] = useState(false);

  const files = useQuery({ queryKey: ["log-files"], queryFn: logsApi.files });
  const query: LogQuery = { date, level: level === "all" ? undefined : level, q: q || undefined, take };
  const logs = useQuery({
    queryKey: ["logs", query],
    queryFn: () => logsApi.list(query),
    placeholderData: keepPreviousData,
    // Tự làm mới mỗi 5 giây khi bật "Theo dõi trực tiếp".
    refetchInterval: live ? 5000 : false,
  });

  const selectedDate = date ?? files.data?.[0]?.date;
  const fileSize = files.data?.find((f) => f.date === selectedDate)?.sizeBytes;

  const filterBy = (value: string) => {
    setKeyword(value);
    setQ(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 xl:flex-row xl:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="log-date">Ngày</Label>
            <Select value={date ?? files.data?.[0]?.date ?? ""} onValueChange={setDate}>
              <SelectTrigger id="log-date" className="w-full">
                <SelectValue placeholder="Hôm nay" />
              </SelectTrigger>
              <SelectContent>
                {(files.data ?? []).map((f) => (
                  <SelectItem key={f.date} value={f.date}>
                    {f.date.split("-").reverse().join("/")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-level">Mức tối thiểu</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as LogLevel | "all")}>
              <SelectTrigger id="log-level" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-take">Số dòng mới nhất</Label>
            <Select value={String(take)} onValueChange={(v) => setTake(Number(v))}>
              <SelectTrigger id="log-take" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[100, 200, 500, 1000].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} dòng
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <form
          role="search"
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(keyword.trim());
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nội dung, đường dẫn, mã yêu cầu..."
              aria-label="Tìm trong nhật ký"
              className="pl-8 xl:w-72"
              maxLength={200}
            />
          </div>
          {q && (
            <Button type="button" variant="ghost" size="icon" aria-label="Bỏ lọc từ khóa" onClick={() => filterBy("")}>
              <X />
            </Button>
          )}
        </form>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="log-live" checked={live} onCheckedChange={(v) => setLive(v === true)} />
            <Label htmlFor="log-live" className="font-normal">
              Theo dõi trực tiếp
            </Label>
          </div>
          <Button variant="outline" size="icon" aria-label="Tải lại" onClick={() => logs.refetch()} disabled={logs.isFetching}>
            <RefreshCw className={cn(logs.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {logs.data && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {logs.data.totalMatched.toLocaleString("vi-VN")} dòng khớp, hiện {logs.data.items.length} dòng mới nhất.
            {fileSize !== undefined && ` File nhật ký ${formatBytes(fileSize)}.`} Cả ngày có:
          </span>
          {(["Debug", "Information", "Warning", "Error", "Fatal"] as LogLevel[])
            .filter((l) => (logs.data!.levelCounts[l] ?? 0) > 0)
            .map((l) => (
              <Badge key={l} variant="outline" className={cn("border-transparent", LEVEL_STYLE[l])}>
                {l}: {logs.data!.levelCounts[l]}
              </Badge>
            ))}
        </div>
      )}

      {logs.error ? (
        <ErrorState message={getErrorMessage(logs.error)} action={<Button onClick={() => logs.refetch()}>Thử lại</Button>} />
      ) : !logs.data ? (
        <LoadingState text="Đang đọc nhật ký..." />
      ) : logs.data.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="Không có dòng nhật ký nào khớp bộ lọc" />
      ) : (
        <ol className="divide-y overflow-hidden rounded-xl border bg-card font-mono text-xs" aria-label="Nhật ký hệ thống">
          {logs.data.items.map((entry, index) => (
            <LogRow key={`${entry.timestamp}-${index}`} entry={entry} onFilter={filterBy} />
          ))}
        </ol>
      )}
    </div>
  );
}

function LogRow({ entry, onFilter }: { entry: LogEntryDto; onFilter: (value: string) => void }) {
  const source = entry.sourceContext?.split(".").at(-1);
  return (
    <li className="space-y-1 px-3 py-2 hover:bg-muted/40" data-testid="log-row">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <time className="text-muted-foreground" dateTime={entry.timestamp}>
          {timeFormatter.format(new Date(entry.timestamp))}
        </time>
        <Badge variant="outline" className={cn("border-transparent font-mono text-[11px]", LEVEL_STYLE[entry.level])}>
          {entry.level.slice(0, 4).toUpperCase()}
        </Badge>
        {source && <span className="text-muted-foreground">{source}</span>}
        {entry.correlationId && (
          <button
            type="button"
            className="rounded bg-muted px-1.5 text-[11px] text-muted-foreground hover:text-primary"
            title="Lọc mọi dòng của yêu cầu này"
            onClick={() => onFilter(entry.correlationId!)}
          >
            #{entry.correlationId.slice(0, 8)}
          </button>
        )}
        {entry.userId && <span className="text-[11px] text-muted-foreground">người dùng {entry.userId.slice(0, 8)}</span>}
      </div>
      <p className="font-sans text-sm break-words whitespace-pre-wrap">{entry.message}</p>
      {entry.exception && (
        <details className="text-destructive">
          <summary className="cursor-pointer">Chi tiết lỗi</summary>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap">{entry.exception}</pre>
        </details>
      )}
    </li>
  );
}
