"use client";

import { useState } from "react";

import { CourseSlotsPanel } from "@/components/app/admin/CourseSlotsPanel";
import { CurriculaPanel } from "@/components/app/admin/CurriculaPanel";
import { CurriculumSemestersPanel } from "@/components/app/admin/CurriculumSemestersPanel";
import { SemestersPanel } from "@/components/app/admin/SemestersPanel";
import { SubjectsPanel } from "@/components/app/admin/SubjectsPanel";
import { useTabArrowNav } from "@/components/ui/useTabArrowNav";
import { cn } from "@/lib/cn";

type AcademicSubTab =
  | "curricula"
  | "semesters"
  | "curriculum-semesters"
  | "subjects"
  | "course-slots";

const SUB_TAB_IDS: AcademicSubTab[] = [
  "curricula",
  "semesters",
  "curriculum-semesters",
  "subjects",
  "course-slots",
];

const SUB_TABS: { id: AcademicSubTab; label: string }[] = [
  { id: "curricula", label: "Chương trình đào tạo" },
  { id: "semesters", label: "Học kỳ" },
  { id: "curriculum-semesters", label: "Kỳ theo CTĐT" },
  { id: "subjects", label: "Môn học" },
  { id: "course-slots", label: "Môn trong CTĐT" },
];

export function AcademicAdminPanel() {
  const [subTab, setSubTab] = useState<AcademicSubTab>("curricula");
  const [curriculumSemestersSeed, setCurriculumSemestersSeed] = useState<{
    curriculumId: string;
    nonce: number;
  } | null>(null);
  const handleKeyDown = useTabArrowNav(SUB_TAB_IDS, setSubTab);

  function navigateToCurriculumSemesters(curriculumId: string) {
    setCurriculumSemestersSeed({ curriculumId, nonce: Date.now() });
    setSubTab("curriculum-semesters");
  }

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
        id="panel-academic-curricula"
        role="tabpanel"
        aria-labelledby="tab-academic-curricula"
        tabIndex={0}
        hidden={subTab !== "curricula"}
        className="outline-none"
      >
        {subTab === "curricula" && <CurriculaPanel />}
      </div>
      <div
        id="panel-academic-semesters"
        role="tabpanel"
        aria-labelledby="tab-academic-semesters"
        tabIndex={0}
        hidden={subTab !== "semesters"}
        className="outline-none"
      >
        {subTab === "semesters" && <SemestersPanel />}
      </div>
      <div
        id="panel-academic-curriculum-semesters"
        role="tabpanel"
        aria-labelledby="tab-academic-curriculum-semesters"
        tabIndex={0}
        hidden={subTab !== "curriculum-semesters"}
        className="outline-none"
      >
        {subTab === "curriculum-semesters" && (
          <CurriculumSemestersPanel
            key={curriculumSemestersSeed?.nonce ?? "default"}
            initialCurriculumId={curriculumSemestersSeed?.curriculumId}
          />
        )}
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
        id="panel-academic-course-slots"
        role="tabpanel"
        aria-labelledby="tab-academic-course-slots"
        tabIndex={0}
        hidden={subTab !== "course-slots"}
        className="outline-none"
      >
        {subTab === "course-slots" && (
          <CourseSlotsPanel onNavigateToCurriculumSemesters={navigateToCurriculumSemesters} />
        )}
      </div>
    </div>
  );
}
