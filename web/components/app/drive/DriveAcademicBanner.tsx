"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";

import { BrutalButton } from "@/components/ui/BrutalButton";
import type { AcademicProfile } from "@/lib/queries/catalog";

interface DriveAcademicBannerProps {
  profile: AcademicProfile | undefined;
  isLoading?: boolean;
}

export function DriveAcademicBanner({ profile, isLoading }: DriveAcademicBannerProps) {
  if (isLoading) {
    return (
      <div className="mb-4 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-4 py-3 text-sm text-brutal-muted">
        Đang tải hồ sơ học thuật…
      </div>
    );
  }

  if (!profile?.isComplete || !profile.major || !profile.currentSemester) {
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

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-surface px-4 py-3 shadow-brutal-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-brutal-ink">
        <GraduationCap className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          <span className="font-mono font-extrabold">{profile.major.code}</span>
          <span className="text-brutal-muted"> · </span>
          Học kỳ {profile.currentSemester}
          <span className="text-brutal-muted"> · </span>
          {subjectCount} môn đang học
        </span>
      </div>
      <Link
        href="/profile"
        className="text-xs font-bold text-brutal-primary underline-offset-2 hover:underline"
      >
        Sửa hồ sơ
      </Link>
    </div>
  );
}
