"use client";

import { X } from "lucide-react";

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
  curriculumId: string;
  semesterId: string;
  subjectId: string;
  sort: PublicDocumentSort;
}

export const DEFAULT_LIBRARY_FILTERS: LibraryFilterState = {
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

const FILTER_SELECT_CLASS =
  "focus-brutal mt-1 block w-auto min-w-[7rem] max-w-full truncate rounded-lg border-2 border-brutal-ink bg-brutal-bg px-2 py-2 text-sm font-medium text-brutal-ink";

export function LibraryFiltersBar({
  filters,
  onChange,
  defaultSort = "newest",
  mode,
}: LibraryFiltersBarProps) {
  const isSuggested = mode === "suggested";
  const { data: curricula } = useCatalogCurricula();
  const { data: profile } = useAcademicProfile();
  const effectiveCurriculumId = isSuggested
    ? profile?.curriculum?.id
    : filters.curriculumId || undefined;
  const catalogDisabled = isSuggested
    ? !profile?.isComplete
    : !filters.curriculumId;

  const { data: curriculumSemesters } = useCatalogCurriculumSemesters(effectiveCurriculumId);
  const { data: curriculum } = useCatalogCourseSlots(
    effectiveCurriculumId,
    filters.semesterId || undefined,
  );

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
    if (!profile?.isComplete || !profile.curriculum) {
      return;
    }
    onChange({
      ...filters,
      curriculumId: profile.curriculum.id,
      semesterId: "",
      subjectId: "",
    });
  }

  function clearFilters() {
    onChange({ ...DEFAULT_LIBRARY_FILTERS, sort: defaultSort });
  }

  const hasActiveFilters =
    (!isSuggested && filters.curriculumId) ||
    filters.semesterId ||
    filters.subjectId ||
    filters.sort !== defaultSort;

  return (
    <div className="rounded-xl border-2 border-brutal-ink bg-brutal-surface p-4 shadow-brutal-sm">
      <div className="flex flex-wrap items-end gap-3">
        {!isSuggested && (
          <label className="relative z-10 min-w-[9rem] text-xs font-bold text-brutal-muted">
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
              className={FILTER_SELECT_CLASS}
            >
              <option value="">Tất cả CTĐT</option>
              {curricula?.map((m) => (
                <option key={m.id} value={m.id} title={`${m.code} — ${m.name}`}>
                  {m.code}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="relative z-10 min-w-[7rem] text-xs font-bold text-brutal-muted">
          Học kỳ
          <select
            value={filters.semesterId}
            onChange={(e) => patch({ semesterId: e.target.value, subjectId: "" })}
            disabled={catalogDisabled}
            className={cn(FILTER_SELECT_CLASS, "disabled:opacity-50")}
          >
            <option value="">Tất cả</option>
            {semesterOptions.map((semester) => (
              <option
                key={semester.id}
                value={semester.id}
                title={`${semester.code} — ${semester.name}`}
              >
                {semester.code}
              </option>
            ))}
          </select>
        </label>

        <label className="relative z-10 min-w-[9rem] text-xs font-bold text-brutal-muted">
          Môn
          <select
            value={filters.subjectId}
            onChange={(e) => patch({ subjectId: e.target.value })}
            disabled={catalogDisabled}
            className={cn(FILTER_SELECT_CLASS, "disabled:opacity-50")}
          >
            <option value="">Tất cả môn</option>
            {uniqueSubjects.map((s) => (
              <option key={s.id} value={s.id} title={`${s.code} — ${s.name}`}>
                {s.code}
              </option>
            ))}
          </select>
        </label>

        <label className="relative z-10 min-w-[7rem] text-xs font-bold text-brutal-muted">
          Sắp xếp
          <select
            value={filters.sort}
            onChange={(e) => patch({ sort: e.target.value as PublicDocumentSort })}
            className={FILTER_SELECT_CLASS}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {!isSuggested && (
          <BrutalButton
            variant="secondary"
            className="w-auto! shrink-0 px-3 py-2 text-xs"
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
              "focus-brutal inline-flex shrink-0 items-center gap-1 rounded-lg border-2 border-brutal-ink px-3 py-2 text-xs font-bold hover:bg-brutal-bg",
            )}
          >
            <X className="h-3.5 w-3.5" />
            Xóa bộ lọc
          </button>
        )}
        {!isSuggested && profile && !profile.isComplete && (
          <p className="max-w-xs self-center text-xs text-brutal-muted">
            Cập nhật hồ sơ học thuật để lọc nhanh theo CTĐT của bạn.
          </p>
        )}
      </div>
    </div>
  );
}

export function suggestedFiltersToQueryParams(
  filters: LibraryFilterState,
  profileCurriculumId?: string,
) {
  const narrow = filters.semesterId || filters.subjectId;
  return {
    curriculumId: narrow ? profileCurriculumId : undefined,
    semesterId: filters.semesterId || undefined,
    subjectId: filters.subjectId || undefined,
    sort: filters.sort,
  };
}

export function browseFiltersToQueryParams(filters: LibraryFilterState) {
  return {
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
