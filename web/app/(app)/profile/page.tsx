"use client";

import { CheckCircle2, GraduationCap, IdCard, User2 } from "lucide-react";
import { useState } from "react";

import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { cn } from "@/lib/cn";
import { useAcademicProfile, useCatalogCurricula } from "@/lib/queries/catalog";
import { useUpdateAcademicProfile, useUpdateDisplayName } from "@/lib/queries/users";
import { getUserErrorMessage } from "@/lib/errors";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const savedDisplayName = user?.displayName ?? "";
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const displayName = nameDraft ?? savedDisplayName;
  const [nameError, setNameError] = useState<string | null>(null);

  const {
    data: curricula,
    isLoading: isCurriculaLoading,
    isError: isCurriculaError,
  } = useCatalogCurricula({ enabled: !isAdmin });
  const { data: profile } = useAcademicProfile({ enabled: !isAdmin });

  const [curriculumId, setCurriculumId] = useState("");
  const [academicError, setAcademicError] = useState<string | null>(null);
  const [academicSuccess, setAcademicSuccess] = useState<string | null>(null);

  const curriculumFromProfile = profile?.curriculum?.id ?? "";
  const effectiveCurriculumId = curriculumId || curriculumFromProfile;

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
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <Topbar
        breadcrumbs={[{ label: "Hồ sơ" }]}
        showBreadcrumbRootIcon={false}
      />

      <main
        className="mx-auto min-h-0 w-full min-w-0 max-w-3xl flex-1 space-y-6 overflow-x-hidden p-4 pb-8 sm:p-6 sm:pb-10"
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
              {isAdmin
                ? "Cập nhật tên hiển thị."
                : "Cập nhật tên hiển thị và chương trình đào tạo để Drive và Thư viện gợi ý đúng CTĐT."}
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
                <label
                  htmlFor="profile-display-name"
                  className="block text-xs font-bold text-brutal-muted"
                >
                  Tên hiển thị
                </label>
                <input
                  id="profile-display-name"
                  value={displayName}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Nhập tên hiển thị…"
                  className="focus-brutal mt-1 block w-full rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2.5 text-sm font-medium text-brutal-ink outline-none"
                  aria-label="Tên hiển thị"
                />
                {nameError && <ErrorAlert variant="inline" message={nameError} className="mt-2" />}
              </div>

              {updateName.isError && (
                <ErrorAlert
                  message={getUserErrorMessage(updateName.error)}
                />
              )}

              <div className="flex justify-end">
                <BrutalButton
                  className="w-auto shrink-0"
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

        {!isAdmin && (
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
            {isCurriculaError && (
              <ErrorAlert
                message="Không tải được danh sách CTĐT. Vui lòng thử lại sau."
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
              {isCurriculaLoading ? (
                <p className="text-sm text-brutal-muted">Đang tải danh sách CTĐT…</p>
              ) : curricula?.length === 0 ? (
                <p className="text-sm text-brutal-muted">
                  Chưa có CTĐT nào. Liên hệ quản trị viên.
                </p>
              ) : (
                <div className="min-w-0">
                  <label
                    htmlFor="profile-curriculum"
                    className="block text-xs font-bold text-brutal-muted"
                  >
                    Chương trình đào tạo
                  </label>
                  <select
                    id="profile-curriculum"
                    value={effectiveCurriculumId}
                    onChange={(e) => {
                      setAcademicError(null);
                      setAcademicSuccess(null);
                      setCurriculumId(e.target.value);
                    }}
                    className="focus-brutal mt-1 block w-full min-w-0 max-w-full truncate rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2.5 text-sm font-medium text-brutal-ink"
                  >
                    <option value="">Chọn CTĐT</option>
                    {curricula?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end">
                <BrutalButton
                  className="w-auto shrink-0"
                  variant="secondary"
                  loading={updateAcademic.isPending}
                  onClick={() => {
                    setAcademicError(null);
                    setAcademicSuccess(null);
                    if (!effectiveCurriculumId) {
                      setAcademicError("Vui lòng chọn CTĐT.");
                      return;
                    }
                    updateAcademic.mutate(
                      {
                        curriculumId: effectiveCurriculumId,
                      },
                      {
                        onSuccess: () => {
                          setCurriculumId("");
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
        )}
      </main>
    </div>
  );
}
