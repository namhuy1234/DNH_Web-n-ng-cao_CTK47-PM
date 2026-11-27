// Unit test cho các lớp tiện ích, chạy bằng test runner có sẵn của Node: npm run test:utils
import { AxiosError, AxiosHeaders } from "axios";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError, getErrorMessage, getFieldErrors, toApiError } from "../lib/api/errors.ts";
import { formatDate, formatDuration, getInitials } from "../lib/format.ts";
import { MOCK_RECIPES } from "../lib/mock-data.ts";
import { safeRedirect } from "../lib/navigation.ts";
import { getPageItems, parsePage } from "../lib/pagination.ts";
import { filterRecipes, normalizeText, parseRecipeFilters } from "../lib/recipe-search.ts";

function axiosError(status: number | undefined, data?: unknown, code?: string) {
  const config = { headers: new AxiosHeaders() };
  const response =
    status === undefined ? undefined : { status, statusText: "", headers: {}, config, data };
  return new AxiosError("lỗi", code, config, undefined, response);
}

describe("getPageItems", () => {
  it("hiện đủ khi ít trang", () => assert.deepEqual(getPageItems(2, 5), [1, 2, 3, 4, 5]));
  it("rút gọn hai đầu khi ở giữa", () =>
    assert.deepEqual(getPageItems(5, 10), [1, "ellipsis", 4, 5, 6, "ellipsis", 10]));
  it("rút gọn một phía khi ở đầu", () => assert.deepEqual(getPageItems(1, 10), [1, 2, "ellipsis", 10]));
  it("trang vượt quá bị kẹp về trang cuối", () => assert.deepEqual(getPageItems(99, 10), [1, "ellipsis", 9, 10]));
  it("không có trang", () => assert.deepEqual(getPageItems(1, 0), []));
});

describe("parsePage", () => {
  it("đọc số hợp lệ", () => assert.equal(parsePage("3"), 3));
  it("giá trị sai trả về 1", () => {
    for (const value of [undefined, "", "abc", "0", "-2", "1.5"]) assert.equal(parsePage(value), 1);
  });
  it("lấy phần tử đầu của mảng", () => assert.equal(parsePage(["4", "5"]), 4));
});

describe("format", () => {
  it("formatDuration", () => {
    assert.equal(formatDuration(45), "45 phút");
    assert.equal(formatDuration(90), "1 giờ 30 phút");
    assert.equal(formatDuration(120), "2 giờ");
    assert.equal(formatDuration(0), "0 phút");
    // Số lẻ được làm tròn trước, không ra "60 phút" hay "1 giờ 60 phút".
    assert.equal(formatDuration(59.6), "1 giờ");
    assert.equal(formatDuration(119.7), "2 giờ");
  });
  it("formatDate theo giờ Việt Nam dù máy chạy múi giờ khác", () =>
    assert.equal(formatDate("2026-10-14T20:00:00Z"), "15/10/2026"));
  it("formatDate theo kiểu Việt Nam", () => assert.equal(formatDate("2026-10-14T08:00:00Z"), "14/10/2026"));
  it("formatDate chuỗi sai trả về rỗng", () => assert.equal(formatDate("khong-phai-ngay"), ""));
  it("getInitials", () => {
    assert.equal(getInitials("Đặng Nam Huy"), "NH");
    assert.equal(getInitials("  admin "), "A");
  });
});

describe("ApiError / toApiError", () => {
  it("dùng detail của ProblemDetails", () => {
    const error = toApiError(axiosError(404, { type: "RECIPE_NOT_FOUND", detail: "Không tìm thấy công thức." }));
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "RECIPE_NOT_FOUND");
    assert.equal(error.message, "Không tìm thấy công thức.");
  });
  it("không có detail thì dùng câu mặc định theo mã", () => {
    assert.equal(getErrorMessage(axiosError(429, "")), "Bạn thao tác quá nhanh. Vui lòng chờ một lát rồi thử lại.");
    assert.equal(getErrorMessage(axiosError(502)), "Máy chủ gặp sự cố. Vui lòng thử lại sau.");
    assert.equal(getErrorMessage(axiosError(423, "")), "Tài khoản tạm thời bị khóa. Vui lòng thử lại sau.");
  });
  it("mất mạng và quá thời gian chờ", () => {
    assert.equal(toApiError(axiosError(undefined)).isNetworkError, true);
    assert.match(getErrorMessage(axiosError(undefined, undefined, "ECONNABORTED")), /phản hồi quá lâu/);
  });
  it("lỗi theo trường đổi về camelCase", () => {
    const error = axiosError(400, { errors: { Email: ["Email không hợp lệ."], Password: [] } });
    assert.deepEqual(getFieldErrors(error), { email: "Email không hợp lệ." });
    assert.equal(toApiError(error).isValidationError, true);
  });
  it("Error thường giữ nguyên message", () => assert.equal(getErrorMessage(new Error("abc")), "abc"));
});

describe("safeRedirect", () => {
  it("giữ đường dẫn nội bộ", () => {
    assert.equal(safeRedirect("/dashboard/profile"), "/dashboard/profile");
    assert.equal(safeRedirect("/recipes?page=2#top"), "/recipes?page=2#top");
  });
  it("chặn chuyển hướng ra ngoài", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "evil.com", "", null, undefined]) {
      assert.equal(safeRedirect(bad), "/dashboard", String(bad));
    }
  });
});

describe("recipe-search", () => {
  it("normalizeText bỏ dấu và đ/Đ", () => assert.equal(normalizeText("Đặng Phở BÒ"), "dang pho bo"));
  it("parseRecipeFilters bỏ giá trị lạ", () => {
    assert.deepEqual(parseRecipeFilters({ q: " pho ", difficulty: "all", sort: "xyz" }), {
      q: "pho",
      difficulty: undefined,
      sort: "-createdAt",
    });
    assert.equal(parseRecipeFilters({ difficulty: ["Hard", "Easy"] }).difficulty, "Hard");
  });
  it("lọc theo từ khóa không dấu và độ khó, bỏ bản nháp", () => {
    const byKeyword = filterRecipes(MOCK_RECIPES, { q: "banh", sort: "-createdAt" });
    assert.ok(byKeyword.length > 0 && byKeyword.every((r) => normalizeText(r.title + r.description).includes("banh")));
    assert.ok(filterRecipes(MOCK_RECIPES, { q: "", difficulty: "Easy", sort: "-createdAt" }).every((r) => r.difficulty === "Easy"));
    assert.ok(filterRecipes(MOCK_RECIPES, { q: "", sort: "-createdAt" }).every((r) => r.status === "Published"));
  });
  it("sắp xếp theo thời gian nấu tăng dần", () => {
    const times = filterRecipes(MOCK_RECIPES, { q: "", sort: "cookTime" }).map((r) => r.cookTime);
    assert.deepEqual(times, [...times].sort((a, b) => a - b));
  });
});
