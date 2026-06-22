"use client";

import { CheckCircle2, GraduationCap, IdCard, User2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { cn } from "@/lib/cn";
import { useAcademicProfile, useCatalogCurriculum, useCatalogMajors } from "@/lib/queries/catalog";
import { useUpdateAcademicProfile, useUpdateDisplayName } from "@/lib/queries/users";
import { getUserErrorMessage } from "@/lib/errors";
import { useAuthStore } from "@/stores/auth-store";

function uniqueSubjects(
  curriculum:
    | {
        subject: { id: string; code: string; name: string } | null;
      }[]
    | undefined,
) {
  const subjects =
    curriculum
      ?.map((c) => c.subject)
      .filter(
        (s): s is NonNullable<typeof s> => s !== null,
      ) ?? [];
  return Array.from(new Map(subjects.map((s) => [s.id, s])).values()).sort((a, b) =>
    a.code.localeCompare(b.code),
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  const [nameDraft, setNameDraft] = useState(user?.displayName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);

  const { data: majors } = useCatalogMajors();
  const { data: profile, isLoading: isProfileLoading } = useAcademicProfile();

  const [majorId, setMajorId] = useState("");
  const [semesterNumber, setSemesterNumber] = useState("");
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [academicError, setAcademicError] = useState<string | null>(null);

  const majorFromProfile = profile?.major?.id ?? "";
  const semesterFromProfile =
    profile?.currentSemester !== null && profile?.currentSemester !== undefined
      ? String(profile.currentSemester)
      : "";
  const subjectsFromProfile = profile?.currentSubjects?.map((s) => s.id) ?? [];

  const effectiveMajorId = majorId || majorFromProfile;
  const effectiveSemesterNumber = semesterNumber || semesterFromProfile;
  const semesterNumParsed = effectiveSemesterNumber ? Number(effectiveSemesterNumber) : undefined;

  const { data: curriculum } = useCatalogCurriculum(
    effectiveMajorId || undefined,
    semesterNumParsed,
  );

  const availableSubjects = useMemo(
    () => uniqueSubjects(curriculum),
    [curriculum],
  );

  const effectiveSubjectIds = subjectIds.length > 0 ? subjectIds : subjectsFromProfile;
  const isAcademicComplete = Boolean(profile?.isComplete);

  const updateName = useUpdateDisplayName();
  const updateAcademic = useUpdateAcademicProfile();

  function validateDisplayName(raw: string): string | null {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return "Vui lòng nhập tên hiển thị.";
    if (trimmed.length > 100) return "Tên hiển thị tối đa 100 ký tự.";
    return null;
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: "Hồ sơ" }]} onMenuOpen={() => {}} />

      <main className="flex-1 space-y-6 p-4 sm:p-6" id="main-content">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-accent shadow-brutal-sm">
            <User2 className="h-5 w-5 text-brutal-ink" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-brutal-ink">
              Hồ sơ của tôi
            </h1>
            <p className="text-sm text-brutal-muted">
              Cập nhật tên hiển thị và hồ sơ học thuật để dùng Diễn đàn.
            </p>
          </div>
        </div>

        <BrutalCard>
          <div className="mb-4 flex items-center gap-2">
            <IdCard className="h-5 w-5 text-brutal-ink" aria-hidden="true" />
            <h2 className="font-heading text-lg font-extrabold text-brutal-ink">
              Thông tin cá nhân
            </h2>
          </div>

          {!user ? (
            <ErrorAlert message="Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại." />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-brutal-muted">Email</p>
                <p className="mt-1 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm font-semibold text-brutal-ink">
                  {user.email}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-brutal-muted">
                  Tên hiển thị
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Nhập tên hiển thị…"
                    className="focus-brutal mt-1 block w-full rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2.5 text-sm font-medium text-brutal-ink outline-none"
                    aria-label="Tên hiển thị"
                  />
                </label>
                {nameError && <ErrorAlert variant="inline" message={nameError} className="mt-2" />}
              </div>

              {updateName.isError && (
                <ErrorAlert
                  message={getUserErrorMessage(updateName.error)}
                />
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <BrutalButton
                  className="sm:w-auto"
                  loading={updateName.isPending}
                  onClick={() => {
                    setNameError(null);
                    const error = validateDisplayName(nameDraft);
                    if (error) {
                      setNameError(error);
                      return;
                    }
                    updateName.mutate(nameDraft.trim());
                  }}
                >
                  Lưu tên
                </BrutalButton>
              </div>
            </div>
          )}
        </BrutalCard>

        <BrutalCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-brutal-ink" aria-hidden="true" />
              <h2 className="font-heading text-lg font-extrabold text-brutal-ink">
                Hồ sơ học thuật
              </h2>
            </div>

            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border-2 border-brutal-ink px-2 py-1 text-xs font-extrabold",
                isAcademicComplete ? "bg-brutal-primary text-white" : "bg-brutal-bg text-brutal-ink",
              )}
              aria-label={isAcademicComplete ? "Hồ sơ đã hoàn thành" : "Hồ sơ chưa hoàn thành"}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {isAcademicComplete ? "Đã hoàn thành" : "Chưa hoàn thành"}
            </div>
          </div>

          {academicError && <ErrorAlert message={academicError} className="mb-3" />}
          {updateAcademic.isError && (
            <ErrorAlert
              message={getUserErrorMessage(updateAcademic.error)}
              className="mb-3"
            />
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs font-bold text-brutal-muted">
                Ngành
                <select
                  value={effectiveMajorId}
                  onChange={(e) => {
                    setAcademicError(null);
                    setMajorId(e.target.value);
                    setSemesterNumber("");
                    setSubjectIds([]);
                  }}
                  className="focus-brutal mt-1 block w-full rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2.5 text-sm font-medium text-brutal-ink"
                >
                  <option value="">Chọn ngành</option>
                  {majors?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-bold text-brutal-muted">
                Học kỳ
                <select
                  value={effectiveSemesterNumber}
                  onChange={(e) => {
                    setAcademicError(null);
                    setSemesterNumber(e.target.value);
                    setSubjectIds([]);
                  }}
                  disabled={!effectiveMajorId}
                  className="focus-brutal mt-1 block w-full rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2.5 text-sm font-medium text-brutal-ink disabled:opacity-50"
                >
                  <option value="">Chọn học kỳ</option>
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const v = String(idx + 1);
                    return (
                      <option key={v} value={v}>
                        Học kỳ {v}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div>
              <p className="text-xs font-bold text-brutal-muted">Môn đang học</p>
              <div className="mt-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg p-3">
                {isProfileLoading ? (
                  <p className="text-sm text-brutal-muted">Đang tải…</p>
                ) : !effectiveMajorId || !effectiveSemesterNumber ? (
                  <p className="text-sm text-brutal-muted">
                    Chọn ngành và học kỳ để hiển thị danh sách môn.
                  </p>
                ) : availableSubjects.length === 0 ? (
                  <p className="text-sm text-brutal-muted">
                    Không có môn phù hợp với ngành và học kỳ đã chọn.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {availableSubjects.map((s) => {
                      const checked = effectiveSubjectIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-start gap-2 rounded-lg border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm font-medium text-brutal-ink"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setAcademicError(null);
                              const next = e.target.checked
                                ? [...new Set([...effectiveSubjectIds, s.id])]
                                : effectiveSubjectIds.filter((id) => id !== s.id);
                              setSubjectIds(next);
                            }}
                            className="mt-1"
                            aria-label={`Chọn môn ${s.code}`}
                          />
                          <span className="min-w-0">
                            <span className="block font-extrabold">{s.code}</span>
                            <span className="block truncate text-xs text-brutal-muted">{s.name}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <BrutalButton
                className="sm:w-auto"
                variant="secondary"
                loading={updateAcademic.isPending}
                onClick={() => {
                  setAcademicError(null);
                  if (!effectiveMajorId) {
                    setAcademicError("Vui lòng chọn ngành.");
                    return;
                  }
                  if (!effectiveSemesterNumber) {
                    setAcademicError("Vui lòng chọn học kỳ.");
                    return;
                  }
                  if (effectiveSubjectIds.length === 0) {
                    setAcademicError("Vui lòng chọn ít nhất 1 môn.");
                    return;
                  }
                  updateAcademic.mutate({
                    majorId: effectiveMajorId,
                    currentSemester: Number(effectiveSemesterNumber),
                    currentSubjectIds: effectiveSubjectIds,
                  });
                }}
              >
                Lưu hồ sơ
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>
      </main>
    </>
  );
}

