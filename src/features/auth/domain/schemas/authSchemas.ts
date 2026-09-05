import { z } from 'zod';

/**
 * Vietnamese Zod Validation Schemas for Customer Authentication Forms
 */

// Phone number regex for standard Vietnamese carrier formats (+84 or 03/05/07/08/09...)
const VIETNAMESE_PHONE_REGEX = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;

/**
 * Login Form Validation Schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email không được để trống.')
    .email('Vui lòng nhập địa chỉ email hợp lệ.'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống.')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration Form Validation Schema
 */
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Họ và tên không được để trống.')
      .min(2, 'Họ và tên phải có ít nhất 2 ký tự.'),
    email: z
      .string()
      .trim()
      .min(1, 'Email không được để trống.')
      .email('Vui lòng nhập địa chỉ email hợp lệ.'),
    phoneNumber: z
      .string()
      .trim()
      .min(1, 'Số điện thoại không được để trống.')
      .regex(VIETNAMESE_PHONE_REGEX, 'Số điện thoại không hợp lệ (ví dụ: 0912345678).'),
    password: z
      .string()
      .min(1, 'Mật khẩu không được để trống.')
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
    confirmPassword: z
      .string()
      .min(1, 'Vui lòng xác nhận lại mật khẩu.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Forgot Password Form Validation Schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email không được để trống.')
    .email('Vui lòng nhập địa chỉ email hợp lệ.'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset Password / OTP Form Validation Schema
 */
export const resetPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Email không được để trống.')
      .email('Vui lòng nhập địa chỉ email hợp lệ.'),
    otp: z
      .string()
      .trim()
      .min(1, 'Mã OTP không được để trống.')
      .length(6, 'Mã OTP phải gồm đúng 6 chữ số.'),
    newPassword: z
      .string()
      .min(1, 'Mật khẩu mới không được để trống.')
      .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự.'),
    confirmPassword: z
      .string()
      .min(1, 'Vui lòng xác nhận lại mật khẩu mới.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
