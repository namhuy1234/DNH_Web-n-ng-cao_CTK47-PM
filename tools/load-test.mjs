#!/usr/bin/env node
/**
 * Đo tải nhẹ các API công khai của Culinary Blog (NFR-PERF): gửi nhiều request song song,
 * tính p50/p95/p99, số lỗi, số bị giới hạn tần suất (429) cho từng endpoint.
 * Chỉ dùng thư viện có sẵn của Node 18+ (fetch, perf_hooks), không cần cài gì thêm.
 *
 * Cách dùng:
 *   node tools/load-test.mjs                       # 200 request, 10 luồng song song
 *   node tools/load-test.mjs --requests 500 --concurrency 20 --api http://localhost:5000
 *   node tools/load-test.mjs --json kq.json        # ghi thêm kết quả ra file JSON
 *
 * Lưu ý: API giới hạn 100 request/phút mỗi IP. Khi đo nhiều hơn, chạy API với
 * RateLimiting__General=100000, nếu không phần lớn kết quả sẽ là 429.
 */
import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    api: { type: "string", default: "http://localhost:5000" },
    requests: { type: "string", default: "200" },
    concurrency: { type: "string", default: "10" },
    json: { type: "string" },
  },
});

const API = `${args.api.replace(/\/$/, "")}/api/v1`;
const TOTAL = Math.max(1, Number.parseInt(args.requests, 10));
const CONCURRENCY = Math.max(1, Number.parseInt(args.concurrency, 10));
/** Ngưỡng hiệu năng mục tiêu cho p95 (ms). */
const TARGET_P95_MS = 500;

/** Lấy một slug công thức thật để đo trang chi tiết. */
async function sampleSlug() {
  const response = await fetch(`${API}/recipes?pageSize=1`);
  if (!response.ok) throw new Error(`GET /recipes trả ${response.status}`);
  const page = await response.json();
  return page.items[0]?.slug;
}

/** Bách phân vị theo phương pháp nearest-rank. */
export function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

async function measure(name, url) {
  const durations = [];
  let errors = 0;
  let limited = 0;
  let next = 0;

  // Mỗi "luồng" lấy request kế tiếp cho tới khi đủ TOTAL.
  async function worker() {
    while (next < TOTAL) {
      next++;
      const started = performance.now();
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        await response.arrayBuffer(); // đọc hết thân để đo đúng thời gian thật
        if (response.status === 429) limited++;
        else if (!response.ok) errors++;
        else durations.push(performance.now() - started);
      } catch {
        errors++;
      }
    }
  }

  const wallStart = performance.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const seconds = (performance.now() - wallStart) / 1000;
  durations.sort((a, b) => a - b);

  return {
    endpoint: name,
    ok: durations.length,
    errors,
    limited,
    rps: Math.round((durations.length + errors + limited) / seconds),
    p50: Math.round(percentile(durations, 50)),
    p95: Math.round(percentile(durations, 95)),
    p99: Math.round(percentile(durations, 99)),
    max: Math.round(durations.at(-1) ?? 0),
  };
}

async function main() {
  console.log(`Đo ${TOTAL} request/endpoint, ${CONCURRENCY} luồng song song, API ${API}\n`);
  const slug = await sampleSlug();

  const targets = [
    ["GET /categories", `${API}/categories`],
    ["GET /recipes", `${API}/recipes?page=1&pageSize=12`],
    ["GET /recipes/search", `${API}/recipes/search?q=ga`],
    ...(slug ? [["GET /recipes/{slug}", `${API}/recipes/${slug}`]] : []),
  ];

  const results = [];
  for (const [name, url] of targets) results.push(await measure(name, url));
  console.table(results);

  const slow = results.filter((r) => r.ok > 0 && r.p95 > TARGET_P95_MS);
  const limited = results.reduce((sum, r) => sum + r.limited, 0);
  if (limited > 0) console.warn(`Có ${limited} request bị 429: đang bị giới hạn tần suất (xem ghi chú đầu file).`);
  if (slow.length > 0) console.warn(`p95 vượt ${TARGET_P95_MS} ms: ${slow.map((r) => r.endpoint).join(", ")}`);
  else console.log(`Mọi endpoint có p95 dưới ${TARGET_P95_MS} ms.`);

  if (args.json) {
    await writeFile(args.json, JSON.stringify({ at: new Date().toISOString(), total: TOTAL, concurrency: CONCURRENCY, results }, null, 2));
    console.log(`Đã ghi ${args.json}`);
  }
  process.exitCode = results.some((r) => r.errors > 0) || slow.length > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(`Lỗi: ${error.message}. API đã chạy chưa?`);
  process.exitCode = 2;
});
