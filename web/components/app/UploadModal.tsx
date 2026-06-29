"use client";

import { CheckCircle2, GraduationCap, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { getUserErrorMessage } from "@/lib/errors";
import { useAcademicProfile, useCatalogCurriculum } from "@/lib/queries/catalog";
import type { DocumentVisibility } from "@/lib/queries/drive";
import {
  uploadToS3,
  useCompleteUpload,
  useUploadIntent,
} from "@/lib/queries/documents";

/* ── Constants ─────────────────────────────────────────────── */

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

const ALLOWED_EXT = ".pdf,.docx,.pptx";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

type Step = "pick" | "uploading" | "done" | "error";
type FormStep = 1 | 2;

/* ── Component ─────────────────────────────────────────────── */

interface UploadModalProps {
  folderId: string | null;
  onClose: () => void;
  defaultCurriculumCourseId?: string;
}

export function UploadModal({
  folderId,
  onClose,
  defaultCurriculumCourseId,
}: UploadModalProps) {
  const [step, setStep] = useState<Step>("pick");
  const [formStep, setFormStep] = useState<FormStep>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [curriculumCourseId, setCurriculumCourseId] = useState(
    defaultCurriculumCourseId ?? "",
  );
  const [visibility, setVisibility] = useState<DocumentVisibility>("private");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: isProfileLoading } = useAcademicProfile();
  const { data: curriculum } = useCatalogCurriculum(
    profile?.major?.id,
    profile?.currentSemester?.id,
  );

  const uploadIntent = useUploadIntent();
  const completeUpload = useCompleteUpload();
  const authUser = useAuthStore((s) => s.user);

  const remainingBytes = authUser
    ? Math.max(0, authUser.storageQuotaBytes - authUser.storageUsedBytes)
    : null;

  const profileComplete = Boolean(profile?.isComplete);

  /** Courses the student is enrolled in for the current semester — the only
   *  mappings the API will accept for an upload. */
  const enrolledCourses = useMemo(() => {
    if (!profile?.isComplete || !curriculum) return [];
    const enrolledSubjectIds = new Set(
      profile.currentSubjects.map((s) => s.id),
    );
    return curriculum.filter(
      (course) => course.subject && enrolledSubjectIds.has(course.subject.id),
    );
  }, [profile, curriculum]);

  function validateFile(file: File): string | null {
    if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
      return "Chỉ chấp nhận tệp PDF, DOCX và PPTX.";
    }
    if (file.size > MAX_BYTES) {
      return "Dung lượng tệp không được vượt quá 50 MB.";
    }
    return null;
  }

  function handleFileSelect(file: File) {
    const err = validateFile(file);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
  }

  const startUpload = useCallback(async () => {
    if (!selectedFile || !curriculumCourseId) return;
    setStep("uploading");
    setProgress(0);

    try {
      const intent = await uploadIntent.mutateAsync({
        originalFilename: selectedFile.name,
        mimeType: selectedFile.type,
        fileSizeBytes: selectedFile.size,
        curriculumCourseId,
        visibility,
        folderId,
      });

      await uploadToS3(intent.uploadUrl, selectedFile, setProgress);
      setProgress(100);

      await completeUpload.mutateAsync({
        documentId: intent.document.id,
        parentId: folderId ?? undefined,
      });

      setStep("done");
    } catch (err) {
      setErrorMsg(getUserErrorMessage(err));
      setStep("error");
    }
  }, [
    selectedFile,
    curriculumCourseId,
    visibility,
    folderId,
    uploadIntent,
    completeUpload,
  ]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleClose() {
    if (step === "uploading") return; // don't allow close while uploading
    onClose();
  }

  const canContinueStep1 = Boolean(selectedFile && curriculumCourseId);
  const canSubmit = canContinueStep1;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: "var(--z-modal-overlay)",
        backgroundColor: "rgba(26,26,26,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <BrutalCard className="w-full max-w-md" style={{ zIndex: "var(--z-modal)" }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 id="upload-modal-title" className="font-heading text-xl font-extrabold">
            Tải lên tệp
          </h2>
          <button
            onClick={handleClose}
            disabled={step === "uploading"}
            className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-brutal-ink transition-colors hover:bg-brutal-bg disabled:opacity-50"
            aria-label="Đóng hộp thoại tải lên"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6">
          {/* ── Step: pick ────────────────────────────────── */}
          {(step === "pick" || step === "error") && (
            <>
              {!isProfileLoading && !profileComplete ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-6 py-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal-sm">
                      <GraduationCap className="h-7 w-7 text-brutal-primary" />
                    </div>
                    <div>
                      <p className="font-heading text-base font-extrabold text-brutal-ink">
                        Cần hồ sơ học thuật
                      </p>
                      <p className="mt-1 text-sm text-brutal-muted">
                        Mỗi tài liệu phải gắn với một môn trong chương trình đào
                        tạo. Hãy chọn ngành, học kỳ và môn học trước khi tải lên.
                      </p>
                    </div>
                  </div>
                  <Link href="/profile" onClick={handleClose} className="block">
                    <BrutalButton variant="primary" className="w-full">
                      <GraduationCap className="h-4 w-4" />
                      Cập nhật hồ sơ học thuật
                    </BrutalButton>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {remainingBytes !== null && (
                    <p className="text-xs text-brutal-muted">
                      Dung lượng còn lại:{" "}
                      <span className="font-bold text-brutal-ink">
                        {formatBytes(remainingBytes)}
                      </span>
                    </p>
                  )}
                  <p className="text-xs font-bold text-brutal-muted">
                    Bước {formStep}/2 — {formStep === 1 ? "Tệp và môn học" : "Quyền hiển thị"}
                  </p>

                  {formStep === 1 && (
                    <>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="upload-course"
                      className="block text-sm font-semibold text-brutal-ink"
                    >
                      Môn học{" "}
                      <span className="text-brutal-danger" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <select
                      id="upload-course"
                      value={curriculumCourseId}
                      onChange={(e) => setCurriculumCourseId(e.target.value)}
                      className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2.5 text-sm font-medium text-brutal-ink shadow-brutal-sm outline-none"
                    >
                      <option value="">Chọn môn học…</option>
                      {enrolledCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.subject?.code} — {course.subject?.name}
                        </option>
                      ))}
                    </select>
                    {profileComplete && enrolledCourses.length === 0 && (
                      <p className="text-xs text-brutal-muted">
                        Không tìm thấy môn nào trong học kỳ hiện tại. Kiểm tra lại
                        hồ sơ học thuật.
                      </p>
                    )}
                  </div>

                  {/* Drop zone */}
                  <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-3 border-dashed px-6 py-8 text-center transition-colors ${
                      isDragging
                        ? "border-brutal-primary bg-orange-50"
                        : "border-brutal-ink bg-brutal-bg hover:bg-brutal-surface"
                    }`}
                    role="button"
                    aria-label="Nhấn để chọn tệp hoặc kéo thả"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && inputRef.current?.click()
                    }
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal-sm">
                      <Upload className="h-7 w-7 text-brutal-primary" />
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="font-bold text-brutal-ink">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-brutal-muted">
                          {(selectedFile.size / 1_048_576).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-brutal-ink">
                          Kéo thả hoặc{" "}
                          <span className="text-brutal-primary underline">
                            chọn tệp
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-brutal-muted">
                          PDF, DOCX, PPTX — tối đa 50 MB
                        </p>
                      </div>
                    )}
                  </div>

                  <input
                    ref={inputRef}
                    type="file"
                    accept={ALLOWED_EXT}
                    className="sr-only"
                    aria-hidden="true"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />

                  {errorMsg && <ErrorAlert message={errorMsg} variant="inline" />}

                  <BrutalButton
                    variant="primary"
                    className="w-full"
                    disabled={!canContinueStep1}
                    onClick={() => setFormStep(2)}
                  >
                    Tiếp tục
                  </BrutalButton>
                    </>
                  )}

                  {formStep === 2 && (
                    <>
                      {selectedFile && (
                        <p className="rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm">
                          <span className="font-bold">{selectedFile.name}</span>
                          <span className="text-brutal-muted">
                            {" "}
                            —{" "}
                            {enrolledCourses.find((c) => c.id === curriculumCourseId)
                              ?.subject?.code ?? "Môn đã chọn"}
                          </span>
                        </p>
                      )}

                      <fieldset className="space-y-1.5">
                        <legend className="text-sm font-semibold text-brutal-ink">
                          Quyền hiển thị
                        </legend>
                        <div className="grid grid-cols-2 gap-2">
                          {(
                            [
                              {
                                value: "private" as const,
                                label: "Riêng tư",
                                hint: "Chỉ bạn và người được chia sẻ",
                              },
                              {
                                value: "public" as const,
                                label: "Công khai",
                                hint: "Mọi sinh viên có thể tìm thấy",
                              },
                            ]
                          ).map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setVisibility(option.value)}
                              aria-pressed={visibility === option.value}
                              className={cn(
                                "focus-brutal rounded-xl border-2 border-brutal-ink px-3 py-2 text-left text-sm transition-all",
                                visibility === option.value
                                  ? "bg-brutal-primary text-brutal-on-brand shadow-brutal-sm"
                                  : "bg-brutal-surface hover:bg-brutal-bg",
                              )}
                            >
                              <span className="block font-bold">{option.label}</span>
                              <span
                                className={cn(
                                  "mt-0.5 block text-xs",
                                  visibility === option.value
                                    ? "text-brutal-on-brand/80"
                                    : "text-brutal-muted",
                                )}
                              >
                                {option.hint}
                              </span>
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <div className="flex gap-2">
                        <BrutalButton
                          variant="ghost"
                          className="flex-1"
                          onClick={() => setFormStep(1)}
                        >
                          Quay lại
                        </BrutalButton>
                        <BrutalButton
                          variant="primary"
                          className="flex-1"
                          disabled={!canSubmit}
                          onClick={() => void startUpload()}
                        >
                          <Upload className="h-4 w-4" />
                          Tải lên
                        </BrutalButton>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Step: uploading ───────────────────────────── */}
          {step === "uploading" && (
            <div className="space-y-5 py-4 text-center">
              <div className="flex justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-brutal-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="font-heading text-lg font-extrabold">Đang tải lên…</p>
                <p className="text-sm text-brutal-muted">{selectedFile?.name}</p>
              </div>
              <div
                className="h-3 w-full overflow-hidden rounded-full border-2 border-brutal-ink bg-brutal-bg"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Tiến độ tải lên: ${progress}%`}
              >
                <div
                  className="h-full rounded-full bg-brutal-accent transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="tabular-nums text-sm text-brutal-muted">{progress}%</p>
            </div>
          )}

          {/* ── Step: done ────────────────────────────────── */}
          {step === "done" && (
            <div className="space-y-5 py-4 text-center">
              <div className="flex justify-center">
                <CheckCircle2
                  className="h-12 w-12 text-brutal-accent"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="font-heading text-lg font-extrabold">
                  Tải lên thành công!
                </p>
                <p className="text-sm text-brutal-muted">
                  Tệp đang được xử lý và sẽ sẵn sàng trong giây lát.
                </p>
              </div>
              <BrutalButton variant="primary" className="w-full" onClick={handleClose}>
                Xong
              </BrutalButton>
            </div>
          )}
        </div>
      </BrutalCard>
    </div>
  );
}
