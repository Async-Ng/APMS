"use client";

import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
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

/* ── Component ─────────────────────────────────────────────── */

interface UploadModalProps {
  folderId: string | null;
  onClose: () => void;
}

export function UploadModal({ folderId, onClose }: UploadModalProps) {
  const [step, setStep] = useState<Step>("pick");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadIntent = useUploadIntent();
  const completeUpload = useCompleteUpload();

  /* Validate file */
  function validateFile(file: File): string | null {
    if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
      return "Only PDF, DOCX, and PPTX files are allowed.";
    }
    if (file.size > MAX_BYTES) {
      return "File size must be under 50 MB.";
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

  /* Upload sequence */
  const startUpload = useCallback(async () => {
    if (!selectedFile) return;
    setStep("uploading");
    setProgress(0);

    try {
      // Step 1: Get presigned intent
      const intent = await uploadIntent.mutateAsync({
        originalFilename: selectedFile.name,
        mimeType: selectedFile.type,
        fileSizeBytes: selectedFile.size,
        folderId: folderId,
      });

      // Step 2: PUT to S3
      await uploadToS3(intent.uploadUrl, selectedFile, setProgress);
      setProgress(100);

      // Step 3: Mark complete
      await completeUpload.mutateAsync({
        documentId: intent.id,
        parentId: folderId ?? undefined,
      });

      setStep("done");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
      setStep("error");
    }
  }, [selectedFile, folderId, uploadIntent, completeUpload]);

  /* Drag-and-drop */
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  /* Close + reset */
  function handleClose() {
    if (step === "uploading") return; // don't allow close while uploading
    onClose();
  }

  return (
    /* Overlay */
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
      <BrutalCard
        className="w-full max-w-md"
        style={{ zIndex: "var(--z-modal)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            id="upload-modal-title"
            className="font-heading text-xl font-extrabold"
          >
            Upload File
          </h2>
          <button
            onClick={handleClose}
            disabled={step === "uploading"}
            className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-brutal-ink transition-colors hover:bg-brutal-bg disabled:opacity-50"
            aria-label="Close upload modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6">
          {/* ── Step: pick ────────────────────────────────── */}
          {(step === "pick" || step === "error") && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-3 border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging
                    ? "border-brutal-primary bg-orange-50"
                    : "border-brutal-ink bg-brutal-bg hover:bg-brutal-surface"
                }`}
                role="button"
                aria-label="Click to select file or drag and drop"
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
                      Drag & drop or{" "}
                      <span className="text-brutal-primary underline">
                        browse
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-brutal-muted">
                      PDF, DOCX, PPTX — max 50 MB
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

              {errorMsg && (
                <p
                  role="alert"
                  className="rounded-xl border-2 border-brutal-danger bg-red-50 px-3 py-2 text-sm font-medium text-brutal-danger"
                >
                  {errorMsg}
                </p>
              )}

              <BrutalButton
                variant="primary"
                className="w-full"
                disabled={!selectedFile}
                onClick={() => void startUpload()}
              >
                <Upload className="h-4 w-4" />
                Upload
              </BrutalButton>
            </div>
          )}

          {/* ── Step: uploading ───────────────────────────── */}
          {step === "uploading" && (
            <div className="space-y-5 py-4 text-center">
              <div className="flex justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-brutal-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="font-heading text-lg font-extrabold">Uploading…</p>
                <p className="text-sm text-brutal-muted">{selectedFile?.name}</p>
              </div>
              {/* Progress bar */}
              <div
                className="h-3 w-full overflow-hidden rounded-full border-2 border-brutal-ink bg-brutal-bg"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Upload progress: ${progress}%`}
              >
                <div
                  className="h-full rounded-full bg-brutal-accent transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="tabular-nums text-sm text-brutal-muted">
                {progress}%
              </p>
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
                  Upload complete!
                </p>
                <p className="text-sm text-brutal-muted">
                  Your file is being processed and will be ready shortly.
                </p>
              </div>
              <BrutalButton
                variant="primary"
                className="w-full"
                onClick={handleClose}
              >
                Done
              </BrutalButton>
            </div>
          )}
        </div>
      </BrutalCard>
    </div>
  );
}
