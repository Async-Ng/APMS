export type AdminTabId = "overview" | "users" | "access-emails" | "academic";

export const ADMIN_TAB_IDS: AdminTabId[] = [
  "overview",
  "users",
  "access-emails",
  "academic",
];

export const ADMIN_TABS: {
  id: AdminTabId;
  label: string;
  description: string;
}[] = [
  {
    id: "overview",
    label: "Tổng quan",
    description: "Thống kê hệ thống",
  },
  {
    id: "users",
    label: "Người dùng",
    description: "Quản lý tài khoản",
  },
  {
    id: "access-emails",
    label: "Email truy cập",
    description: "Ngoại lệ domain",
  },
  {
    id: "academic",
    label: "Học thuật",
    description: "CTĐT, học kỳ, môn học",
  },
];

export function parseAdminTab(value: string | null): AdminTabId {
  if (
    value === "overview" ||
    value === "users" ||
    value === "access-emails" ||
    value === "academic"
  ) {
    return value;
  }
  return "overview";
}
