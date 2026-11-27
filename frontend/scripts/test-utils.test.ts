// Unit test cho các lớp tiện ích, chạy bằng test runner có sẵn của Node: npm run test:utils
import { AxiosError, AxiosHeaders } from "axios";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError, getErrorMessage, getFieldErrors, toApiError } from "../lib/api/errors.ts";
import { formatDate, formatDuration, getInitials } from "../lib/format.ts";
import { safeRedirect } from "../lib/navigation.ts";
import { getPageItems, parsePage } from "../lib/pagination.ts";
import { filterQuery, parseRecipeFilters } from "../lib/recipe-search.ts";
import {
  changePasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from "../lib/validation/auth.ts";

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
  it("không quay lại trang đăng nhập/đăng ký (tránh vòng lặp)", () => {
    for (const page of ["/login", "/register?x=1", "/forgot-password", "/reset-password?token=a", "/login/"]) {
      assert.equal(safeRedirect(page), "/dashboard", page);
    }
    assert.equal(safeRedirect("/login-history"), "/login-history");
  });
  it("chặn chuyển hướng ra ngoài", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "evil.com", "", null, undefined]) {
      assert.equal(safeRedirect(bad), "/dashboard", String(bad));
    }
  });
});

describe("recipe-search", () => {
  it("parseRecipeFilters bỏ giá trị lạ", () => {
    assert.deepEqual(parseRecipeFilters({ q: " pho ", difficulty: "all", sort: "xyz", categoryId: "abc", page: "-1" }), {
      q: "pho",
      categoryId: undefined,
      difficulty: undefined,
      sort: "-createdAt",
      page: 1,
    });
    assert.equal(parseRecipeFilters({ difficulty: ["Hard", "Easy"] }).difficulty, "Hard");
  });
  it("parseRecipeFilters nhận categoryId dạng GUID và số trang", () => {
    const id = "5F6E5827-0DE5-4294-9013-D326663DD2B8";
    const f = parseRecipeFilters({ categoryId: id, page: "3" });
    assert.equal(f.categoryId, id.toLowerCase());
    assert.equal(f.page, 3);
  });
  it("filterQuery bỏ trang và giá trị mặc định", () => {
    const f = parseRecipeFilters({ q: "ga", difficulty: "Easy", page: "2", sort: "-createdAt" });
    assert.deepEqual(filterQuery(f, ["q", "categoryId", "difficulty", "sort", "page"]), { q: "ga", difficulty: "Easy" });
  });
});

describe("validation (Zod) khớp quy tắc backend", () => {
  const strong = "Moi@12345";
  it("đăng nhập cần email hợp lệ và mật khẩu", () => {
    assert.equal(loginSchema.safeParse({ email: " a@b.vn ", password: "x" }).success, true);
    assert.equal(loginSchema.safeParse({ email: "sai", password: "x" }).success, false);
    assert.equal(loginSchema.safeParse({ email: "a@b.vn", password: "" }).success, false);
  });
  it("đăng ký: mật khẩu mạnh và nhập lại khớp", () => {
    const ok = { displayName: "Huy", email: "a@b.vn", password: strong, confirmPassword: strong };
    assert.equal(registerSchema.safeParse(ok).success, true);
    for (const weak of ["Moi12345", "moi@12345", "MOI@12345", "Moi@abcd", "Mo@1"]) {
      assert.equal(registerSchema.safeParse({ ...ok, password: weak, confirmPassword: weak }).success, false, weak);
    }
    const mismatch = registerSchema.safeParse({ ...ok, confirmPassword: "Khac@12345" });
    assert.equal(mismatch.success, false);
    assert.deepEqual(mismatch.error?.issues[0].path, ["confirmPassword"]);
  });
  it("đổi mật khẩu: mật khẩu mới phải khác mật khẩu cũ", () => {
    const same = changePasswordSchema.safeParse({ currentPassword: strong, newPassword: strong, confirmPassword: strong });
    assert.equal(same.success, false);
    assert.deepEqual(same.error?.issues[0].path, ["newPassword"]);
    assert.equal(
      changePasswordSchema.safeParse({ currentPassword: "Cu@12345", newPassword: strong, confirmPassword: strong }).success,
      true,
    );
  });
  it("đặt lại mật khẩu: nhập lại phải khớp", () => {
    assert.equal(resetPasswordSchema.safeParse({ newPassword: strong, confirmPassword: strong }).success, true);
    assert.equal(resetPasswordSchema.safeParse({ newPassword: strong, confirmPassword: "x" }).success, false);
  });
  it("hồ sơ: ảnh đại diện phải là http/https hoặc để trống", () => {
    const base = { displayName: "Huy", bio: "" };
    assert.equal(profileSchema.safeParse({ ...base, avatarUrl: "" }).success, true);
    assert.equal(profileSchema.safeParse({ ...base, avatarUrl: "https://a.vn/x.png" }).success, true);
    assert.equal(profileSchema.safeParse({ ...base, avatarUrl: "javascript:alert(1)" }).success, false);
    assert.equal(profileSchema.safeParse({ ...base, avatarUrl: "", displayName: "H" }).success, false);
    assert.equal(profileSchema.safeParse({ ...base, avatarUrl: "", bio: "a".repeat(1001) }).success, false);
  });
});
