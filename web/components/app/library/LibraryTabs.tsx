"use client";

import { BrutalTabs } from "@/components/ui/BrutalTabs";

export type LibraryTabId = "suggested" | "browse";

const TABS = [
  {
    id: "suggested" as const,
    label: "Gợi ý",
    description:
      "Phù hợp chương trình đào tạo trong hồ sơ của bạn.",
  },
  {
    id: "browse" as const,
    label: "Tất cả",
    description: "Xem và lọc tài liệu công khai theo CTĐT, học kỳ và môn học.",
  },
];

export function LibraryTabs({
  active,
  onChange,
  count,
}: {
  active: LibraryTabId;
  onChange: (tab: LibraryTabId) => void;
  count?: number;
}) {
  return (
    <BrutalTabs
      size="sm"
      tabs={TABS.map((tab) => ({
        ...tab,
        count: active === tab.id ? count : undefined,
      }))}
      active={active}
      onChange={onChange}
      ariaLabel="Chế độ xem thư viện công khai"
    />
  );
}
