"use client";

import { BrutalTabs } from "@/components/ui/BrutalTabs";

export type ForumLibraryTabId = "suggested" | "library";

const TABS = [
  {
    id: "suggested" as const,
    label: "Gợi ý",
    description:
      "Phù hợp môn bạn đang học — ưu tiên đúng ngành và học kỳ trong hồ sơ.",
  },
  {
    id: "library" as const,
    label: "Duyệt toàn bộ",
    description: "Duyệt toàn bộ tài liệu công khai theo ngành, học kỳ và môn học.",
  },
];

export function ForumLibraryTabs({
  active,
  onChange,
  count,
}: {
  active: ForumLibraryTabId;
  onChange: (tab: ForumLibraryTabId) => void;
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
