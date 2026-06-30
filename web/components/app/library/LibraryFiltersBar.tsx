"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import {
  useAcademicProfile,
  useCatalogCourseSlots,
  useCatalogCurriculumSemesters,
  useCatalogCurricula,
} from "@/lib/queries/catalog";
import type { PublicDocumentSort } from "@/lib/queries/public-documents";
import { cn } from "@/lib/cn";

export interface LibraryFilterState {
  search: string;
  curriculumId: string;
  semesterId: string;
  subjectId: string;
  sort: PublicDocumentSort;
}

export const DEFAULT_LIBRARY_FILTERS: LibraryFilterState = {
  search: "",
  curriculumId: "",
  semesterId: "",
  subjectId: "",
  sort: "newest",
};

export type LibraryFilterMode = "suggested" | "browse";

interface LibraryFiltersBarProps {
  filters: LibraryFilterState;
  onChange: (filters: LibraryFilterState) => void;
  defaultSort?: PublicDocumentSort;
  mode: LibraryFilterMode;
}

const SORT_OPTIONS: { value: PublicDocumentSort; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "title", label: "Tên A–Z" },
];

export function LibraryFiltersBar({
  filters,
  onChange,
  defaultSort = "newest",
  mode,
}: LibraryFiltersBarProps) {
  const isBrowse = mode === "browse";
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [prevSearch, setPrevSearch] = useState(filters.search);

  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search);
    setLocalSearch(filters.search);
  }

  const { data: curricula } = useCatalogCurricula();
  const { data: profile } = useAcademicProfile();
  const { data: curriculumSemesters } = useCatalogCurriculumSemesters(filters.curriculumId || undefined);
  const { data: curriculum } = useCatalogCourseSlots(
    filters.curriculumId || undefined,
    filters.semesterId || undefined,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== filters.search) {
        onChange({ ...filters, search: localSearch });
      }
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce search only
  }, [localSearch]);

  const semesterOptions =
    curriculumSemesters
      ?.filter((link) => link.isActive && link.semester)
      .map((link) => link.semester!)
      .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  const subjects =
    curriculum
      ?.map((c) => c.subject)
      .filter((s): s is NonNullable<typeof s> => s !== null) ?? [];

  const uniqueSubjects = Array.from(
    new Map(subjects.map((s) => [s.id, s])).values(),
  );

  function patch(partial: Partial<LibraryFilterState>) {
    onChange({ ...filters, ...partial });
  }

  function applyMyProfile() {
    if (!profile?.isComplete || !profile.curriculum || !profile.currentSemester) {
      return;
    }
    const firstSubject = profile.currentSubjects[0];
    onChange({
      ...filters,
      curriculumId: profile.curriculum.id,
      semesterId: profile.currentSemester.id,
      subjectId: firstSubject?.id ?? "",
    });
  }

  function clearFilters() {
    onChange({ ...DEFAULT_LIBRARY_FILTERS, sort: defaultSort });
    setLocalSearch("");
  }

  const hasActiveFilters = isBrowse
    ? filters.search ||
      filters.curriculumId ||
      filters.semesterId ||
      filters.subjectId ||
      filters.sort !== defaultSort
    : filters.search || filters.sort !== defaultSort;

  return (
    <div className="space-y-3 rounded-xl border-2 border-brutal-ink bg-brutal-surface p-4 shadow-brutal-sm">
      {!isBrowse && (
        <p className="text-xs text-brutal-muted">
          Gợi ý hiển thị tài liệu theo hồ sơ học thuật của bạn.
        </p>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brutal-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm theo tên tài liệu…"
            className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-bg py-2.5 pl-9 pr-4 text-sm outline-none"
            aria-label="Tìm tài liệu"
          />
        </div>

        {isBrowse && (
          <>
            <label className="text-xs font-bold text-brutal-muted">
              CTĐT
              <select
                value={filters.curriculumId}
                onChange={(e) =>
                  patch({
                    curriculumId: e.target.value,
                    semesterId: "",
                    subjectId: "",
                  })
                }
                className="focus-brutal mt-1 block w-full min-w-[140px] rounded-lg border-2 border-brutal-ink bg-brutal-bg px-2 py-2 text-sm font-medium text-brutal-ink"
              >
                <option value="">Tất cả CTĐT</option>
                {curricula?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-brutal-muted">
              Học kỳ
              <select
                value={filters.semesterId}
                onChange={(e) => patch({ semesterId: e.target.value, subjectId: "" })}
                disabled={!filters.curriculumId}
                className="focus-brutal mt-1 block w-full min-w-[100px] rounded-lg border-2 border-brutal-ink bg-brutal-bg px-2 py-2 text-sm font-medium text-brutal-ink disabled:opacity-50"
              >
                <option value="">Tất cả</option>
                {semesterOptions.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.code} — {semester.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-brutal-muted">
              Môn
              <select
                value={filters.subjectId}
                onChange={(e) => patch({ subjectId: e.target.value })}
                disabled={!filters.curriculumId}
                className="focus-brutal mt-1 block w-full min-w-[140px] rounded-lg border-2 border-brutal-ink bg-brutal-bg px-2 py-2 text-sm font-medium text-brutal-ink disabled:opacity-50"
              >
                <option value="">Tất cả môn</option>
                {uniqueSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <label className="text-xs font-bold text-brutal-muted">
          Sắp xếp
          <select
            value={filters.sort}
            onChange={(e) => patch({ sort: e.target.value as PublicDocumentSort })}
            className="focus-brutal mt-1 block w-full min-w-[120px] rounded-lg border-2 border-brutal-ink bg-brutal-bg px-2 py-2 text-sm font-medium text-brutal-ink"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isBrowse && (
          <BrutalButton
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            onClick={applyMyProfile}
            disabled={!profile?.isComplete}
            title={
              profile?.isComplete
                ? undefined
                : "Hoàn thành hồ sơ học thuật để dùng bộ lọc này"
            }
          >
            Theo hồ sơ của tôi
          </BrutalButton>
        )}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className={cn(
              "focus-brutal inline-flex items-center gap-1 rounded-lg border-2 border-brutal-ink px-3 py-1.5 text-xs font-bold hover:bg-brutal-bg",
            )}
          >
            <X className="h-3.5 w-3.5" />
            Xóa bộ lọc
          </button>
        )}
        {isBrowse && profile && !profile.isComplete && (
          <p className="text-xs text-brutal-muted">
            Cập nhật hồ sơ học thuật để lọc nhanh theo CTĐT và học kỳ của bạn.
          </p>
        )}
      </div>
    </div>
  );
}

export function suggestedFiltersToQueryParams(filters: LibraryFilterState) {
  return {
    search: filters.search || undefined,
    sort: filters.sort,
  };
}

export function browseFiltersToQueryParams(filters: LibraryFilterState) {
  return {
    search: filters.search || undefined,
    curriculumId: filters.curriculumId || undefined,
    semesterId: filters.semesterId || undefined,
    subjectId: filters.subjectId || undefined,
    sort: filters.sort,
  };
}

/** @deprecated Use suggestedFiltersToQueryParams */
export const forumFiltersToQueryParams = suggestedFiltersToQueryParams;
/** @deprecated Use browseFiltersToQueryParams */
export const libraryFiltersToQueryParams = browseFiltersToQueryParams;
