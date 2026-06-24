"use client";

import { useState } from "react";

import { CurriculumPanel } from "@/components/app/admin/CurriculumPanel";
import { MajorsPanel } from "@/components/app/admin/MajorsPanel";
import { SubjectsPanel } from "@/components/app/admin/SubjectsPanel";
import { useTabArrowNav } from "@/components/ui/useTabArrowNav";
import { cn } from "@/lib/cn";

type AcademicSubTab = "majors" | "subjects" | "curriculum";

const SUB_TAB_IDS: AcademicSubTab[] = ["majors", "subjects", "curriculum"];

const SUB_TABS: { id: AcademicSubTab; label: string }[] = [
  { id: "majors", label: "Ngành học" },
  { id: "subjects", label: "Môn học" },
  { id: "curriculum", label: "Chương trình đào tạo" },
];

export function AcademicAdminPanel() {
  const [subTab, setSubTab] = useState<AcademicSubTab>("majors");
  const handleKeyDown = useTabArrowNav(SUB_TAB_IDS, setSubTab);

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
            id={`tab-academic-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            aria-controls={`panel-academic-${tab.id}`}
            tabIndex={subTab === tab.id ? 0 : -1}
            onClick={() => setSubTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
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

      <div
        id="panel-academic-majors"
        role="tabpanel"
        aria-labelledby="tab-academic-majors"
        tabIndex={0}
        hidden={subTab !== "majors"}
        className="outline-none"
      >
        {subTab === "majors" && <MajorsPanel />}
      </div>
      <div
        id="panel-academic-subjects"
        role="tabpanel"
        aria-labelledby="tab-academic-subjects"
        tabIndex={0}
        hidden={subTab !== "subjects"}
        className="outline-none"
      >
        {subTab === "subjects" && <SubjectsPanel />}
      </div>
      <div
        id="panel-academic-curriculum"
        role="tabpanel"
        aria-labelledby="tab-academic-curriculum"
        tabIndex={0}
        hidden={subTab !== "curriculum"}
        className="outline-none"
      >
        {subTab === "curriculum" && <CurriculumPanel />}
      </div>
    </div>
  );
}
