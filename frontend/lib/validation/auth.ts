import { z } from "zod";

/*
 * Schema Zod 4 cho các form tài khoản. Quy tắc trùng với FluentValidation ở backend
 * (NFR-SEC-001) để người dùng thấy lỗi ngay, không phải chờ gọi API.
 */

const email = z.string().trim().pipe(z.email({ error: "Email không hợp lệ." }).max(256));

export const passwordSchema = z
  .string()
  .min(8, { error: "Mật khẩu dài từ 8 đến 100 ký tự." })
  .max(100, { error: "Mật khẩu dài từ 8 đến 100 ký tự." })
  .regex(/[A-Z]/, { error: "Mật khẩu cần ít nhất 1 chữ hoa." })
  .regex(/[a-z]/, { error: "Mật khẩu cần ít nhất 1 chữ thường." })
  .regex(/[0-9]/, { error: "Mật khẩu cần ít nhất 1 chữ số." })
  .regex(/[^a-zA-Z0-9]/, { error: "Mật khẩu cần ít nhất 1 ký tự đặc biệt." });

const displayName = z
  .string()
  .trim()
  .min(2, { error: "Tên hiển thị dài từ 2 đến 100 ký tự." })
  .max(100, { error: "Tên hiển thị dài từ 2 đến 100 ký tự." });

const sameAs = (field: string) => ({ error: "Mật khẩu nhập lại không khớp.", path: [field] });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Nhập mật khẩu." }),
});

export const registerSchema = z
  .object({
    displayName,
    email,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, sameAs("confirmPassword"));

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, sameAs("confirmPassword"));

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Nhập mật khẩu hiện tại." }),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, sameAs("confirmPassword"))
  .refine((v) => !v.newPassword || v.newPassword !== v.currentPassword, {
    error: "Mật khẩu mới phải khác mật khẩu hiện tại.",
    path: ["newPassword"],
  });

export const profileSchema = z.object({
  displayName,
  avatarUrl: z
    .string()
    .trim()
    .max(500, { error: "Địa chỉ ảnh tối đa 500 ký tự." })
    .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), { error: "Địa chỉ ảnh phải bắt đầu bằng http:// hoặc https://." }),
  bio: z.string().trim().max(1000, { error: "Giới thiệu tối đa 1000 ký tự." }),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
