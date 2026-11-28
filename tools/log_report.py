"""Báo cáo nhanh từ file nhật ký Serilog (Compact JSON) của Culinary Blog.

Đọc các file logs/culinary-YYYYMMDD*.json rồi thống kê:
  - số bản ghi theo mức (Information, Warning, Error...)
  - các endpoint được gọi nhiều nhất, thời gian xử lý trung bình và p95
  - các request chậm (> 500 ms) và lỗi 5xx gần nhất
  - người dùng hoạt động nhiều nhất

Cách dùng:
  python tools/log_report.py                                  # nhật ký hôm nay
  python tools/log_report.py --date 2026-11-27 --top 5
  python tools/log_report.py --dir src/CulinaryBlog.API/logs --csv ket-qua.csv

Chỉ dùng thư viện chuẩn của Python 3.10+.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

SLOW_MS = 500
# Đường dẫn chứa id (GUID, số) được gộp lại để thống kê theo endpoint, không theo từng bản ghi.
GUID = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
NUMBER = re.compile(r"/\d+(?=/|$)")


@dataclass
class Request:
    time: datetime
    method: str
    path: str
    status: int
    elapsed: float
    user: str | None
    correlation: str | None


def normalize(path: str) -> str:
    """/api/v1/recipes/manage/3f2a...-.../  ->  /api/v1/recipes/manage/{id}"""
    return NUMBER.sub("/{n}", GUID.sub("{id}", path))


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    rank = max(1, min(len(ordered), math.ceil(p / 100 * len(ordered))))
    return ordered[rank - 1]


def read_entries(directory: Path, day: str):
    stem = "culinary-" + day.replace("-", "")
    files = sorted(directory.glob(stem + "*.json"), key=lambda f: (len(f.name), f.name))
    if not files:
        sys.exit(f"Không có file nhật ký {stem}*.json trong {directory}")
    for file in files:
        # Serilog có thể đang ghi dở dòng cuối: dòng lỗi thì bỏ qua.
        with file.open(encoding="utf-8", errors="replace") as handle:
            for line in handle:
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue


def analyse(entries):
    levels: Counter[str] = Counter()
    requests: list[Request] = []
    errors: list[dict] = []

    for e in entries:
        level = e.get("@l", "Information")
        levels[level] += 1
        if level in ("Error", "Fatal"):
            errors.append(e)
        if "StatusCode" in e and "RequestPath" in e and "Elapsed" in e:
            requests.append(Request(
                time=datetime.fromisoformat(e["@t"].replace("Z", "+00:00")),
                method=e.get("RequestMethod", "?"),
                path=normalize(e["RequestPath"]),
                status=int(e["StatusCode"]),
                elapsed=float(e["Elapsed"]),
                user=e.get("UserId"),
                correlation=e.get("CorrelationId"),
            ))
    return levels, requests, errors


def endpoint_table(requests: list[Request]):
    groups: dict[str, list[Request]] = defaultdict(list)
    for r in requests:
        groups[f"{r.method} {r.path}"].append(r)
    rows = []
    for name, items in groups.items():
        times = [r.elapsed for r in items]
        rows.append({
            "endpoint": name,
            "so_lan": len(items),
            "loi_4xx": sum(400 <= r.status < 500 for r in items),
            "loi_5xx": sum(r.status >= 500 for r in items),
            "tb_ms": round(sum(times) / len(times), 1),
            "p95_ms": round(percentile(times, 95), 1),
        })
    return sorted(rows, key=lambda row: row["so_lan"], reverse=True)


def print_table(rows: list[dict]):
    if not rows:
        print("  (không có)")
        return
    headers = list(rows[0])
    widths = [max(len(h), *(len(str(r[h])) for r in rows)) for h in headers]
    print("  " + "  ".join(h.ljust(w) for h, w in zip(headers, widths)))
    print("  " + "  ".join("-" * w for w in widths))
    for r in rows:
        print("  " + "  ".join(str(r[h]).ljust(w) for h, w in zip(headers, widths)))


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Thống kê nhật ký Serilog của Culinary Blog")
    parser.add_argument("--dir", default="src/CulinaryBlog.API/logs", help="thư mục chứa file nhật ký")
    parser.add_argument("--date", default=datetime.now(timezone.utc).strftime("%Y-%m-%d"), help="ngày (UTC) dạng YYYY-MM-DD")
    parser.add_argument("--top", type=int, default=10, help="số dòng mỗi bảng")
    parser.add_argument("--csv", help="ghi bảng endpoint ra file CSV")
    args = parser.parse_args()

    levels, requests, errors = analyse(read_entries(Path(args.dir), args.date))
    print(f"Nhật ký ngày {args.date}: {sum(levels.values())} bản ghi, {len(requests)} request HTTP\n")

    print("Theo mức:")
    print_table([{"muc": k, "so_ban_ghi": v} for k, v in levels.most_common()])

    print(f"\nEndpoint gọi nhiều nhất (top {args.top}):")
    table = endpoint_table(requests)
    print_table(table[: args.top])

    slow = sorted((r for r in requests if r.elapsed > SLOW_MS), key=lambda r: r.elapsed, reverse=True)
    print(f"\nRequest chậm hơn {SLOW_MS} ms: {len(slow)}")
    print_table([{"luc": r.time.strftime("%H:%M:%S"), "request": f"{r.method} {r.path}", "ms": round(r.elapsed),
                  "ma_yeu_cau": (r.correlation or "")[:12]} for r in slow[: args.top]])

    users = Counter(r.user for r in requests if r.user)
    print(f"\nNgười dùng gọi API nhiều nhất:")
    print_table([{"user_id": u, "so_request": n} for u, n in users.most_common(min(5, args.top))])

    print(f"\nLỗi (Error/Fatal): {len(errors)}")
    for e in errors[-args.top:]:
        print(f"  {e['@t'][11:19]}  {e.get('@m', e.get('@mt', ''))[:120]}")

    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8-sig") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(table[0]) if table else ["endpoint"])
            writer.writeheader()
            writer.writerows(table)
        print(f"\nĐã ghi bảng endpoint vào {args.csv}")

    # Có lỗi 5xx thì trả mã 1 để dùng được trong script giám sát.
    return 1 if any(r.status >= 500 for r in requests) else 0


if __name__ == "__main__":
    raise SystemExit(main())
