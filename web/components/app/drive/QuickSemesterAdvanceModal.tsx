"use client";

import { useMemo } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { defaultSubjectIds } from "@/lib/academic-profile";
import type { CatalogSemester } from "@/lib/queries/catalog";
import { useCatalogCurriculum } from "@/lib/queries/catalog";
import { useUpdateAcademicProfile } from "@/lib/queries/users";
import { getUserErrorMessage } from "@/lib/errors";
import { useDriveViewStore } from "@/stores/drive-view-store";

interface QuickSemesterAdvanceModalProps {
  majorId: string;
  currentSemester: CatalogSemester;
  availableSemesters: CatalogSemester[];
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickSemesterAdvanceModal({
  majorId,
  currentSemester,
  availableSemesters,
  onClose,
  onSuccess,
}: QuickSemesterAdvanceModalProps) {
  const resetDriveView = useDriveViewStore((s) => s.resetDriveViewSemesterId);
  const updateProfile = useUpdateAcademicProfile();

  const nextSemester = useMemo(() => {
    const sorted = [...availableSemesters].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s) => s.id === currentSemester.id);
    if (idx < 0 || idx >= sorted.length - 1) return null;
    return sorted[idx + 1] ?? null;
  }, [availableSemesters, currentSemester.id]);

  const { data: nextCurriculum } = useCatalogCurriculum(
    majorId,
    nextSemester?.id,
  );

  function advanceTo(semester: CatalogSemester, curriculum: typeof nextCurriculum) {
    const subjects =
      curriculum
        ?.map((c) => c.subject)
        .filter((s): s is NonNullable<typeof s> => s !== null) ?? [];
    const uniqueSubjects = Array.from(new Map(subjects.map((s) => [s.id, s])).values());

    updateProfile.mutate(
      {
        majorId,
        currentSemesterId: semester.id,
        currentSubjectIds: defaultSubjectIds(uniqueSubjects),
      },
      {
        onSuccess: () => {
          resetDriveView();
          onSuccess();
          onClose();
        },
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brutal-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-semester-title"
      onClick={onClose}
    >
      <div
        className="brutal-card w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="quick-semester-title"
          className="font-heading text-lg font-extrabold text-brutal-ink"
        >
          Đổi học kỳ chính
        </h2>
        <p className="mt-2 text-sm text-brutal-muted">
          Học kỳ chính hiện tại:{" "}
          <span className="font-bold text-brutal-ink">
            {currentSemester.code} — {currentSemester.name}
          </span>
          . Đổi học kỳ chính sẽ chọn tất cả môn trong CTĐT của kỳ mới (có thể chỉnh
          sau trong Hồ sơ).
        </p>

        {updateProfile.isError && (
          <ErrorAlert
            className="mt-3"
            message={getUserErrorMessage(updateProfile.error)}
          />
        )}

        <div className="mt-4 flex flex-col gap-2">
          {nextSemester && nextCurriculum && (
            <BrutalButton
              variant="primary"
              loading={updateProfile.isPending}
              onClick={() => advanceTo(nextSemester, nextCurriculum)}
            >
              Lên {nextSemester.code} — {nextSemester.name}
            </BrutalButton>
          )}

          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border-2 border-brutal-ink bg-brutal-bg p-2">
            {availableSemesters
              .filter((s) => s.id !== currentSemester.id)
              .map((semester) => (
                <SemesterPickRow
                  key={semester.id}
                  majorId={majorId}
                  semester={semester}
                  loading={updateProfile.isPending}
                  onPick={(curriculum) => advanceTo(semester, curriculum)}
                />
              ))}
          </div>

          <BrutalButton variant="ghost" onClick={onClose} disabled={updateProfile.isPending}>
            Hủy
          </BrutalButton>
        </div>
      </div>
    </div>
  );
}

function SemesterPickRow({
  majorId,
  semester,
  loading,
  onPick,
}: {
  majorId: string;
  semester: CatalogSemester;
  loading: boolean;
  onPick: (curriculum: NonNullable<ReturnType<typeof useCatalogCurriculum>["data"]>) => void;
}) {
  const { data: curriculum, isLoading } = useCatalogCurriculum(majorId, semester.id);

  return (
    <button
      type="button"
      disabled={loading || isLoading || !curriculum?.length}
      onClick={() => curriculum && onPick(curriculum)}
      className="w-full rounded-lg border-2 border-transparent px-3 py-2 text-left text-sm font-semibold text-brutal-ink hover:border-brutal-ink hover:bg-brutal-surface disabled:opacity-50"
    >
      {semester.code} — {semester.name}
      {isLoading && <span className="text-brutal-muted"> …</span>}
    </button>
  );
}
