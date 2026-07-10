"use client";

import { Globe, Lock, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useMemo, useRef, useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { useModalA11y } from "@/components/ui/useModalA11y";
import { cn } from "@/lib/cn";
import {
  isPublishingToLibrary,
  PUBLISH_TO_LIBRARY_CONFIRM_DESCRIPTION,
  PUBLISH_TO_LIBRARY_CONFIRM_TITLE,
  PUBLISH_TO_LIBRARY_PENDING_HINT,
} from "@/lib/document-visibility";
import { getUserErrorMessage } from "@/lib/errors";
import { useAcademicProfile, useCatalogCourseSlots } from "@/lib/queries/catalog";
import type { DocumentVisibility, DriveDocument } from "@/lib/queries/drive";
import { useUpdateDocument } from "@/lib/queries/documents";

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;

interface DocumentSettingsModalProps {
  document: DriveDocument;
  onClose: () => void;
}

export function DocumentSettingsModal({
  document: doc,
  onClose,
}: DocumentSettingsModalProps) {
  const [title, setTitle] = useState(doc.title);
  const [courseSlotId, setCourseSlotId] = useState(
    doc.courseSlotId ?? "",
  );
  const [visibility, setVisibility] = useState<DocumentVisibility>(
    doc.visibility ?? "private",
  );
  const [tags, setTags] = useState<string[]>(doc.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (value.length > MAX_TAG_LENGTH) {
      setError(`Thẻ không được dài quá ${MAX_TAG_LENGTH} ký tự.`);
      return;
    }
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setTagInput("");
      return;
    }
    if (tags.length >= MAX_TAGS) {
      setError(`Tối đa ${MAX_TAGS} thẻ.`);
      return;
    }
    setTags((prev) => [...prev, value]);
    setTagInput("");
    setError(null);
  }

  function removeTag(value: string) {
    setTags((prev) => prev.filter((t) => t !== value));
  }

  function handleTagInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]!);
    }
  }

  const updateDocument = useUpdateDocument(doc.id, doc.folderId ?? undefined);

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(true, onClose, dialogRef, { preventClose: updateDocument.isPending });

  const { data: profile } = useAcademicProfile();
  const { data: curriculum } = useCatalogCourseSlots(
    profile?.curriculum?.id,
  );

  const availableCourses = useMemo(() => {
    if (!profile?.isComplete || !curriculum) return [];
    return curriculum.filter((course) => course.subject);
  }, [profile, curriculum]);

  /** The current course may not be in the available list (e.g. profile changed);
   *  keep it selectable so we never silently drop it. */
  const showsCurrentCourse =
    !!courseSlotId &&
    !availableCourses.some((course) => course.id === courseSlotId);

  async function saveDocument() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Tiêu đề không được để trống.");
      return;
    }
    if (!courseSlotId) {
      setError("Vui lòng chọn môn học cho tài liệu.");
      return;
    }

    try {
      await updateDocument.mutateAsync({
        title: trimmed,
        courseSlotId,
        visibility,
        tags,
      });
      onClose();
    } catch (err) {
      setError(getUserErrorMessage(err));
    }
  }

  function handleSubmit() {
    if (isPublishingToLibrary(doc.visibility, visibility)) {
      setPublishConfirmOpen(true);
      return;
    }
    void saveDocument();
  }

  return (
    <div
      ref={dialogRef}
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
              value={courseSlotId}
              onChange={(e) => {
                setCourseSlotId(e.target.value);
                setError(null);
              }}
              className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2.5 text-sm font-medium text-brutal-ink shadow-brutal-sm outline-none"
            >
              <option value="">Chọn môn học…</option>
              {showsCurrentCourse && (
                <option value={courseSlotId}>Môn hiện tại</option>
              )}
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.semester?.code ? `${course.semester.code} · ` : ""}
                  {course.subject?.code} — {course.subject?.name}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-semibold text-brutal-ink">
              Hiển thị
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "private" as const, label: "Riêng tư", Icon: Lock },
                  {
                    value: "public" as const,
                    label: "Công khai (Thư viện)",
                    Icon: Globe,
                  },
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
                {PUBLISH_TO_LIBRARY_CONFIRM_DESCRIPTION}
              </p>
            )}
            {visibility === "public" && doc.status !== "ready" && (
              <p className="text-xs font-semibold text-brutal-primary">
                {PUBLISH_TO_LIBRARY_PENDING_HINT}
              </p>
            )}
            <p className="text-xs text-brutal-muted">
              Chia sẻ (menu trên thẻ tài liệu) chỉ gửi cho người bạn chọn — khác
              với đăng lên Thư viện công khai.
            </p>
          </fieldset>

          <div className="space-y-1.5">
            <label
              htmlFor="doc-settings-tags"
              className="block text-sm font-semibold text-brutal-ink"
            >
              Thẻ
            </label>
            <div className="flex flex-wrap gap-1.5 rounded-xl border-2 border-brutal-ink bg-brutal-surface p-2 shadow-brutal-sm">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full border-2 border-brutal-ink bg-brutal-bg px-2 py-0.5 text-xs font-semibold text-brutal-ink"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Xoá thẻ ${tag}`}
                    className="focus-brutal rounded-full hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                id="doc-settings-tags"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleTagInputKeyDown}
                onBlur={() => addTag(tagInput)}
                maxLength={MAX_TAG_LENGTH}
                placeholder={tags.length === 0 ? "Nhập thẻ rồi nhấn Enter…" : ""}
                className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm font-medium text-brutal-ink outline-none"
              />
            </div>
            <p className="text-xs text-brutal-muted">
              Tối đa {MAX_TAGS} thẻ, mỗi thẻ tối đa {MAX_TAG_LENGTH} ký tự.
            </p>
          </div>

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
              onClick={() => handleSubmit()}
              loading={updateDocument.isPending}
            >
              Lưu
            </BrutalButton>
          </div>
        </div>
      </BrutalCard>

      <ConfirmDialog
        open={publishConfirmOpen}
        title={PUBLISH_TO_LIBRARY_CONFIRM_TITLE}
        description={PUBLISH_TO_LIBRARY_CONFIRM_DESCRIPTION}
        confirmLabel="Đăng lên thư viện"
        isPending={updateDocument.isPending}
        onConfirm={() => {
          setPublishConfirmOpen(false);
          void saveDocument();
        }}
        onClose={() => setPublishConfirmOpen(false)}
      />
    </div>
  );
}
