"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { QuickSemesterAdvanceModal } from "@/components/app/drive/QuickSemesterAdvanceModal";
import { BrutalButton } from "@/components/ui/BrutalButton";
import type { CatalogSemester } from "@/lib/queries/catalog";
import type { AcademicProfile } from "@/lib/queries/catalog";
import type { DriveViewSemesterId } from "@/stores/drive-view-store";

interface DriveAcademicBannerProps {
  profile: AcademicProfile | undefined;
  isLoading?: boolean;
  viewSemesterId?: DriveViewSemesterId;
  availableSemesters?: CatalogSemester[];
}

export function DriveAcademicBanner({
  profile,
  isLoading,
  viewSemesterId,
  availableSemesters = [],
}: DriveAcademicBannerProps) {
  const [advanceOpen, setAdvanceOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mb-4 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-4 py-3 text-sm text-brutal-muted">
        Đang tải hồ sơ học thuật…
      </div>
    );
  }

  if (!profile?.isComplete || !profile.curriculum || !profile.currentSemester) {
    return (
      <div className="mb-4 flex flex-col gap-3 rounded-xl border-2 border-brutal-ink bg-brutal-accent/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brutal-ink" aria-hidden />
          <div>
            <p className="font-heading text-sm font-extrabold text-brutal-ink">
              Cần hồ sơ học thuật
            </p>
            <p className="mt-0.5 text-sm text-brutal-muted">
              Chọn ngành, học kỳ và môn đang học để Drive sắp xếp tài liệu theo từng môn.
            </p>
          </div>
        </div>
        <Link href="/profile" className="shrink-0">
          <BrutalButton variant="primary" className="w-full sm:w-auto">
            Cập nhật hồ sơ
          </BrutalButton>
        </Link>
      </div>
    );
  }

  const subjectCount = profile.currentSubjects.length;
  const primarySemester = profile.currentSemester;
  const viewingOtherSemester =
    viewSemesterId &&
    viewSemesterId !== "all" &&
    viewSemesterId !== primarySemester.id;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-xl border-2 border-brutal-ink bg-brutal-surface px-4 py-3 shadow-brutal-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-brutal-ink">
            <GraduationCap className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              <span className="text-brutal-muted">Học kỳ chính:</span>{" "}
              <span className="font-mono font-extrabold">{profile.curriculum.code}</span>
              <span className="text-brutal-muted"> · </span>
              {primarySemester.code} — {primarySemester.name}
              <span className="text-brutal-muted"> · </span>
              {subjectCount} môn
            </span>
          </div>
          {viewingOtherSemester && (
            <p className="text-xs font-semibold text-brutal-primary">
              Đang xem học kỳ khác trên Drive — hồ sơ và upload vẫn theo học kỳ chính.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {availableSemesters.length > 1 && (
            <BrutalButton
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setAdvanceOpen(true)}
            >
              Lên học kỳ
            </BrutalButton>
          )}
          <Link
            href="/profile"
            className="text-xs font-bold text-brutal-primary underline-offset-2 hover:underline"
          >
            Sửa hồ sơ
          </Link>
        </div>
      </div>

      {advanceOpen && (
        <QuickSemesterAdvanceModal
          curriculumId={profile.curriculum.id}
          currentSemester={primarySemester}
          availableSemesters={availableSemesters}
          onClose={() => setAdvanceOpen(false)}
          onSuccess={() => setAdvanceOpen(false)}
        />
      )}
    </>
  );
}
