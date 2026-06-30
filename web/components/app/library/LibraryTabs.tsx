"use client";

import { BrutalTabs } from "@/components/ui/BrutalTabs";

export type LibraryTabId = "suggested" | "browse";

const TABS = [
  {
    id: "suggested" as const,
    label: "Gợi ý",
    description:
      "Phù hợp môn bạn đang học — ưu tiên đúng CTĐT và học kỳ trong hồ sơ.",
  },
  {
    id: "browse" as const,
    label: "Duyệt toàn bộ",
    description: "Duyệt toàn bộ tài liệu công khai theo CTĐT, học kỳ và môn học.",
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
