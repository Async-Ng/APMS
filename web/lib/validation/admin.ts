import { z } from "zod";

const codeField = z
  .string()
  .trim()
  .min(1, "Mã không được để trống")
  .max(30, "Mã tối đa 30 ký tự");

const descriptionField = z
  .string()
  .trim()
  .max(1000, "Mô tả tối đa 1000 ký tự");

export const majorFormSchema = z.object({
  code: codeField,
  name: z
    .string()
    .trim()
    .min(1, "Tên không được để trống")
    .max(150, "Tên tối đa 150 ký tự"),
  description: descriptionField.optional(),
});

export const subjectFormSchema = z.object({
  code: codeField,
  name: z
    .string()
    .trim()
    .min(1, "Tên không được để trống")
    .max(200, "Tên tối đa 200 ký tự"),
  description: descriptionField.optional(),
});

export const curriculumFormSchema = z.object({
  majorId: z.string().min(1, "Chọn ngành học"),
  subjectId: z.string().min(1, "Chọn môn học"),
  semesterNumber: z.coerce
    .number()
    .int("Học kỳ phải là số nguyên")
    .min(1, "Học kỳ từ 1 đến 9")
    .max(9, "Học kỳ từ 1 đến 9"),
});

export const accessEmailSchema = z
  .string()
  .trim()
  .min(1, "Email không được để trống")
  .email("Email không hợp lệ");

export function formatZodFieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!result[key]) {
      result[key] = issue.message;
    }
  }
  return result;
}
