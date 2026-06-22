"use client";

import { useState } from "react";

import { CurriculumPanel } from "@/components/app/admin/CurriculumPanel";
import { MajorsPanel } from "@/components/app/admin/MajorsPanel";
import { SubjectsPanel } from "@/components/app/admin/SubjectsPanel";
import { cn } from "@/lib/cn";

type AcademicSubTab = "majors" | "subjects" | "curriculum";

const SUB_TABS: { id: AcademicSubTab; label: string }[] = [
  { id: "majors", label: "Ngành học" },
  { id: "subjects", label: "Môn học" },
  { id: "curriculum", label: "Chương trình đào tạo" },
];

export function AcademicAdminPanel() {
  const [subTab, setSubTab] = useState<AcademicSubTab>("majors");

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Quản lý học thuật"
      >
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            onClick={() => setSubTab(tab.id)}
            className={cn(
              "focus-brutal rounded-lg border-2 border-brutal-ink px-3 py-1.5 text-sm font-bold",
              subTab === tab.id
                ? "bg-brutal-secondary text-white"
                : "bg-brutal-surface hover:bg-brutal-bg",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "majors" && <MajorsPanel />}
      {subTab === "subjects" && <SubjectsPanel />}
      {subTab === "curriculum" && <CurriculumPanel />}
    </div>
  );
}
