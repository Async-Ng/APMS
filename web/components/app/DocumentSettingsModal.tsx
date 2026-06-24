"use client";

import { Globe, Lock, X } from "lucide-react";
import { useMemo, useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { cn } from "@/lib/cn";
import { getUserErrorMessage } from "@/lib/errors";
import { useAcademicProfile, useCatalogCurriculum } from "@/lib/queries/catalog";
import type { DocumentVisibility, DriveDocument } from "@/lib/queries/drive";
import { useUpdateDocument } from "@/lib/queries/documents";

interface DocumentSettingsModalProps {
  document: DriveDocument;
  onClose: () => void;
}

export function DocumentSettingsModal({
  document: doc,
  onClose,
}: DocumentSettingsModalProps) {
  const [title, setTitle] = useState(doc.title);
  const [curriculumCourseId, setCurriculumCourseId] = useState(
    doc.curriculumCourseId ?? "",
  );
  const [visibility, setVisibility] = useState<DocumentVisibility>(
    doc.visibility ?? "private",
  );
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useAcademicProfile();
  const { data: curriculum } = useCatalogCurriculum(
    profile?.major?.id,
    profile?.currentSemester ?? undefined,
  );
  const updateDocument = useUpdateDocument(doc.id, doc.folderId ?? undefined);

  const enrolledCourses = useMemo(() => {
    if (!profile?.isComplete || !curriculum) return [];
    const enrolledSubjectIds = new Set(profile.currentSubjects.map((s) => s.id));
    return curriculum.filter(
      (course) => course.subject && enrolledSubjectIds.has(course.subject.id),
    );
  }, [profile, curriculum]);

  /** The current course may not be in the enrolled list (e.g. profile changed);
   *  keep it selectable so we never silently drop it. */
  const showsCurrentCourse =
    !!curriculumCourseId &&
    !enrolledCourses.some((course) => course.id === curriculumCourseId);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Tiêu đề không được để trống.");
      return;
    }
    if (!curriculumCourseId) {
      setError("Vui lòng chọn môn học cho tài liệu.");
      return;
    }

    try {
      await updateDocument.mutateAsync({
        title: trimmed,
        curriculumCourseId,
        visibility,
      });
      onClose();
    } catch (err) {
      setError(getUserErrorMessage(err));
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: "var(--z-modal-overlay)",
        backgroundColor: "rgba(26,26,26,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-settings-title"
    >
      <BrutalCard className="w-full max-w-md" style={{ zIndex: "var(--z-modal)" }}>
        <div className="flex items-center justify-between">
          <h2
            id="document-settings-title"
            className="font-heading text-xl font-extrabold"
          >
            Chỉnh sửa tài liệu
          </h2>
          <button
            onClick={onClose}
            className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-brutal-ink transition-colors hover:bg-brutal-bg"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="doc-settings-title"
              className="block text-sm font-semibold text-brutal-ink"
            >
              Tiêu đề
            </label>
            <input
              id="doc-settings-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              maxLength={255}
              className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2.5 text-sm font-medium text-brutal-ink shadow-brutal-sm outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="doc-settings-course"
              className="block text-sm font-semibold text-brutal-ink"
            >
              Môn học
            </label>
            <select
              id="doc-settings-course"
              value={curriculumCourseId}
              onChange={(e) => {
                setCurriculumCourseId(e.target.value);
                setError(null);
              }}
              className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2.5 text-sm font-medium text-brutal-ink shadow-brutal-sm outline-none"
            >
              <option value="">Chọn môn học…</option>
              {showsCurrentCourse && (
                <option value={curriculumCourseId}>Môn hiện tại</option>
              )}
              {enrolledCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.subject?.code} — {course.subject?.name}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-semibold text-brutal-ink">
              Quyền hiển thị
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "private" as const, label: "Riêng tư", Icon: Lock },
                  { value: "public" as const, label: "Công khai", Icon: Globe },
                ]
              ).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setVisibility(value)}
                  aria-pressed={visibility === value}
                  className={cn(
                    "focus-brutal flex items-center gap-2 rounded-xl border-2 border-brutal-ink px-3 py-2 text-sm font-bold transition-all",
                    visibility === value
                      ? "bg-brutal-primary text-brutal-on-brand shadow-brutal-sm"
                      : "bg-brutal-surface hover:bg-brutal-bg",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            {visibility === "public" && doc.visibility !== "public" && (
              <p className="text-xs text-brutal-muted">
                Tài liệu công khai sẽ hiển thị cho mọi sinh viên trong hệ thống.
              </p>
            )}
          </fieldset>

          {error && <ErrorAlert message={error} variant="inline" />}

          <div className="flex gap-2 pt-1">
            <BrutalButton
              variant="ghost"
              className="flex-1"
              onClick={onClose}
              disabled={updateDocument.isPending}
            >
              Huỷ
            </BrutalButton>
            <BrutalButton
              variant="primary"
              className="flex-1"
              onClick={() => void handleSubmit()}
              loading={updateDocument.isPending}
            >
              Lưu
            </BrutalButton>
          </div>
        </div>
      </BrutalCard>
    </div>
  );
}
