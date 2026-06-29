"use client";

import { CheckCircle2, GraduationCap, IdCard, User2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { cn } from "@/lib/cn";
import {
  defaultSubjectIds,
  MAX_ACADEMIC_SUBJECTS,
  resolveSelectedSubjectIds,
} from "@/lib/academic-profile";
import { useAcademicProfile, useCatalogCurriculum, useCatalogMajorSemesters, useCatalogMajors, type CatalogCurriculumItem } from "@/lib/queries/catalog";
import { useUpdateAcademicProfile, useUpdateDisplayName } from "@/lib/queries/users";
import { getUserErrorMessage } from "@/lib/errors";
import { useAuthStore } from "@/stores/auth-store";

function uniqueSubjects(curriculum: CatalogCurriculumItem[] | undefined) {
  const subjects =
    curriculum
      ?.map((c) => c.subject)
      .filter((s): s is NonNullable<typeof s> => s !== null) ?? [];
  return Array.from(new Map(subjects.map((s) => [s.id, s])).values()).sort((a, b) =>
    a.code.localeCompare(b.code),
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  const savedDisplayName = user?.displayName ?? "";
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const displayName = nameDraft ?? savedDisplayName;
  const [nameError, setNameError] = useState<string | null>(null);

  const {
    data: majors,
    isLoading: isMajorsLoading,
    isError: isMajorsError,
  } = useCatalogMajors();
  const { data: profile, isLoading: isProfileLoading } = useAcademicProfile();

  const [majorId, setMajorId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [subjectIds, setSubjectIds] = useState<string[] | null>(null);
  const [academicError, setAcademicError] = useState<string | null>(null);
  const [academicSuccess, setAcademicSuccess] = useState<string | null>(null);

  const majorFromProfile = profile?.major?.id ?? "";
  const semesterFromProfile = profile?.currentSemester?.id ?? "";
  const subjectsFromProfile = profile?.currentSubjects?.map((s) => s.id) ?? [];

  const effectiveMajorId = majorId || majorFromProfile;
  const effectiveSemesterId = semesterId || semesterFromProfile;

  const {
    data: curriculum,
    isLoading: isCurriculumLoading,
    isError: isCurriculumError,
  } = useCatalogCurriculum(
    effectiveMajorId || undefined,
    effectiveSemesterId || undefined,
  );

  const { data: majorSemesters } = useCatalogMajorSemesters(effectiveMajorId || undefined);

  const availableSemesters =
    majorSemesters
      ?.filter((link) => link.isActive && link.semester)
      .map((link) => link.semester!)
      .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  const availableSubjects = useMemo(
    () => uniqueSubjects(curriculum),
    [curriculum],
  );

  const selectionMatchesProfile =
    effectiveMajorId === majorFromProfile &&
    effectiveSemesterId === semesterFromProfile;

  const selectedSubjectIds = resolveSelectedSubjectIds({
    subjectIds,
    selectionMatchesProfile,
    subjectsFromProfile,
    availableSubjects,
  });

  const subjectsOverLimit = availableSubjects.length > MAX_ACADEMIC_SUBJECTS;

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
    <div className="flex w-full min-w-0 flex-1 flex-col">
      <Topbar
        breadcrumbs={[{ label: "Hồ sơ" }]}
        showBreadcrumbRootIcon={false}
      />

      <main
        className="mx-auto w-full min-w-0 max-w-3xl flex-1 space-y-6 overflow-x-hidden p-4 pb-8 sm:p-6 sm:pb-10"
        id="main-content"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-accent shadow-brutal-sm">
            <User2 className="h-5 w-5 text-brutal-ink" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-brutal-ink">
              Hồ sơ của tôi
            </h1>
            <p className="text-sm text-brutal-muted">
              Cập nhật tên hiển thị và hồ sơ học thuật để Drive và Thư viện gợi ý đúng môn.
            </p>
          </div>
        </div>

        <BrutalCard className="min-w-0">
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
                    value={displayName}
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
                    const error = validateDisplayName(displayName);
                    if (error) {
                      setNameError(error);
                      return;
                    }
                    updateName.mutate(displayName.trim(), {
                      onSuccess: () => setNameDraft(null),
                    });
                  }}
                >
                  Lưu tên
                </BrutalButton>
              </div>
            </div>
          )}
        </BrutalCard>

        <BrutalCard className="min-w-0">
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

          {academicSuccess && (
            <p
              role="status"
              className="mb-3 rounded-xl border-2 border-brutal-ink bg-brutal-primary px-3 py-2 text-sm font-semibold text-white"
            >
              {academicSuccess}
            </p>
          )}
          {academicError && <ErrorAlert message={academicError} className="mb-3" />}
          {isMajorsError && (
            <ErrorAlert
              message="Không tải được danh sách ngành. Vui lòng thử lại sau."
              className="mb-3"
            />
          )}
          {isCurriculumError && effectiveMajorId && (
            <ErrorAlert
              message="Không tải được chương trình đào tạo của ngành đã chọn."
              className="mb-3"
            />
          )}
          {updateAcademic.isError && (
            <ErrorAlert
              message={getUserErrorMessage(updateAcademic.error)}
              className="mb-3"
            />
          )}

          <div className="space-y-4">
            {isMajorsLoading ? (
              <p className="text-sm text-brutal-muted">Đang tải danh sách ngành…</p>
            ) : majors?.length === 0 ? (
              <p className="text-sm text-brutal-muted">
                Chưa có ngành nào. Liên hệ quản trị viên.
              </p>
            ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs font-bold text-brutal-muted">
                Ngành
                <select
                  value={effectiveMajorId}
                  onChange={(e) => {
                    setAcademicError(null);
                    setAcademicSuccess(null);
                    setMajorId(e.target.value);
                    setSemesterId("");
                    setSubjectIds(null);
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
                  value={effectiveSemesterId}
                  onChange={(e) => {
                    setAcademicError(null);
                    setAcademicSuccess(null);
                    setSemesterId(e.target.value);
                    setSubjectIds(null);
                  }}
                  disabled={!effectiveMajorId}
                  className="focus-brutal mt-1 block w-full rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2.5 text-sm font-medium text-brutal-ink disabled:opacity-50"
                >
                  <option value="">Chọn học kỳ</option>
                  {availableSemesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.code} — {semester.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            )}

            <div>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-brutal-muted">Môn đang học</p>
                  <p className="mt-0.5 text-xs text-brutal-muted">
                    Mặc định chọn tất cả môn trong học kỳ — bỏ tick môn bạn không học.
                  </p>
                </div>
                {effectiveSemesterId && availableSubjects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-brutal-muted">
                      Đã chọn {selectedSubjectIds.length} / {availableSubjects.length} môn
                    </span>
                    <BrutalButton
                      type="button"
                      variant="ghost"
                      className="!w-auto !px-2 !py-1 text-xs"
                      onClick={() => {
                        setAcademicError(null);
                        setAcademicSuccess(null);
                        setSubjectIds(defaultSubjectIds(availableSubjects));
                      }}
                    >
                      Chọn tất cả
                    </BrutalButton>
                    <BrutalButton
                      type="button"
                      variant="ghost"
                      className="!w-auto !px-2 !py-1 text-xs"
                      onClick={() => {
                        setAcademicError(null);
                        setAcademicSuccess(null);
                        setSubjectIds([]);
                      }}
                    >
                      Bỏ chọn
                    </BrutalButton>
                  </div>
                )}
              </div>
              {subjectsOverLimit && effectiveSemesterId && (
                <ErrorAlert
                  variant="inline"
                  className="mb-2"
                  message={`Học kỳ có ${availableSubjects.length} môn; hệ thống chọn tối đa ${MAX_ACADEMIC_SUBJECTS} môn theo mã môn. Bỏ tick môn không học trước khi lưu.`}
                />
              )}
              <div className="mt-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg p-3">
                {isProfileLoading || (effectiveMajorId && isCurriculumLoading) ? (
                  <p className="text-sm text-brutal-muted">Đang tải…</p>
                ) : !effectiveMajorId ? (
                  <p className="text-sm text-brutal-muted">
                    Chọn ngành để xem học kỳ và môn học.
                  </p>
                ) : !effectiveSemesterId ? (
                  <p className="text-sm text-brutal-muted">
                    Chọn học kỳ để hiển thị danh sách môn.
                  </p>
                ) : availableSemesters.length === 0 ? (
                  <p className="text-sm text-brutal-muted">
                    Ngành này chưa có học kỳ được gán.
                  </p>
                ) : availableSubjects.length === 0 ? (
                  <p className="text-sm text-brutal-muted">
                    Không có môn phù hợp với ngành và học kỳ đã chọn.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {availableSubjects.map((s) => {
                      const checked = selectedSubjectIds.includes(s.id);
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
                              setAcademicSuccess(null);
                              const next = e.target.checked
                                ? [...new Set([...selectedSubjectIds, s.id])]
                                : selectedSubjectIds.filter((id) => id !== s.id);
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
                  setAcademicSuccess(null);
                  if (!effectiveMajorId) {
                    setAcademicError("Vui lòng chọn ngành.");
                    return;
                  }
                  if (!effectiveSemesterId) {
                    setAcademicError("Vui lòng chọn học kỳ.");
                    return;
                  }
                  const availableSubjectIdSet = new Set(availableSubjects.map((s) => s.id));
                  const subjectIdsToSave = selectedSubjectIds.filter((id) =>
                    availableSubjectIdSet.has(id),
                  );
                  if (subjectIdsToSave.length === 0) {
                    setAcademicError("Vui lòng chọn ít nhất 1 môn.");
                    return;
                  }
                  updateAcademic.mutate(
                    {
                      majorId: effectiveMajorId,
                      currentSemesterId: effectiveSemesterId,
                      currentSubjectIds: subjectIdsToSave,
                    },
                    {
                      onSuccess: () => {
                        setMajorId("");
                        setSemesterId("");
                        setSubjectIds(null);
                        setAcademicSuccess("Đã lưu hồ sơ học thuật.");
                      },
                    },
                  );
                }}
              >
                Lưu hồ sơ
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>
      </main>
    </div>
  );
}

