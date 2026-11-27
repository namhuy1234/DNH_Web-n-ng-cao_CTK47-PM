// Lấy dữ liệu thật từ backend rồi cho TypeScript đối chiếu với các kiểu đã khai báo.
// Chạy backend trước, sau đó: npm run check:api
import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const API = (process.env.API_URL ?? "http://localhost:5000") + "/api/v1";
const settings = JSON.parse(
  readFileSync(new URL("../../src/CulinaryBlog.API/appsettings.Development.json", import.meta.url), "utf8")
    .replace(/^\uFEFF/, ""),
);

async function call(path, init) {
  const response = await fetch(API + path, init);
  return response.json();
}

const json = (body) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const categories = await call("/categories");
const busiest = [...categories].sort((a, b) => b.recipeCount - a.recipeCount)[0];
const recipes = await call("/recipes?pageSize=5");
const session = await call("/auth/login", json({ email: "admin@culinaryblog.local", password: settings.Seed.Password }));

const samples = [
  ["CategoryDto[]", categories],
  ["CategoryDetailDto", await call(`/categories/${busiest.slug}?pageSize=3`)],
  ["PagedResult<RecipeSummaryDto>", recipes],
  ["RecipeDetailDto", await call(`/recipes/${recipes.items[0].slug}`)],
  // Không ghi token thật ra file, chỉ cần giữ đúng kiểu string.
  ["AuthResponseDto", { ...session, accessToken: "an", refreshToken: "an" }],
  ["UserProfileDto", await call("/auth/me", { headers: { Authorization: `Bearer ${session.accessToken}` } })],
  ["ProblemDetails", await call("/recipes/khong-ton-tai")],
  ["ProblemDetails", await call("/recipes?page=0")],
];

// Gán trực tiếp object literal nên trường thừa, thiếu hoặc sai kiểu đều bị báo lỗi.
const file = new URL("../types/_api-check.ts", import.meta.url);
writeFileSync(
  file,
  `import type { AuthResponseDto, CategoryDetailDto, CategoryDto, PagedResult, ProblemDetails, RecipeDetailDto, RecipeSummaryDto, UserProfileDto } from ".";\n` +
    samples.map(([type, data], i) => `export const sample${i}: ${type} = ${JSON.stringify(data, null, 2)};`).join("\n"),
);

try {
  execSync("npx tsc --noEmit", { stdio: "inherit" });
  console.log(`Khop kieu: ${samples.length}/${samples.length} phan hoi that tu API`);
  for (const [type] of samples) console.log(`  [DAT] ${type}`);
} finally {
  // Dùng unlinkSync: rmSync của Node 24 không xóa được file trong đường dẫn có dấu trên Windows.
  if (existsSync(file)) unlinkSync(file);
}
