"use client";

import { useMemo, useState } from "react";

import { AdminFormModal } from "@/components/app/admin/AdminFormModal";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { getUserErrorMessage } from "@/lib/errors";
import {
  useBulkCreateAccessEmails,
  type BulkAccessEmailResult,
  type BulkAccessEmailStatus,
} from "@/lib/queries/admin-access-emails";
import { accessEmailSchema } from "@/lib/validation/admin";
import { cn } from "@/lib/cn";

const STATUS_LABELS: Record<BulkAccessEmailStatus, string> = {
  created: "Tạo mới",
  reactivated: "Kích hoạt lại",
  already_active: "Đã có",
  invalid: "Lỗi",
};

function parseBulkLines(text: string): Array<{ email: string; note?: string }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const commaIdx = line.indexOf(",");
      if (commaIdx === -1) return { email: line };
      return {
        email: line.slice(0, commaIdx).trim(),
        note: line.slice(commaIdx + 1).trim() || undefined,
      };
    });
}

function formatResultLabel(
  status: BulkAccessEmailStatus,
  message?: string,
): string {
  if (status === "invalid" && message) return message;
  return STATUS_LABELS[status];
}

interface BulkAccessEmailModalProps {
  open: boolean;
  onClose: () => void;
}

export function BulkAccessEmailModal({ open, onClose }: BulkAccessEmailModalProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<BulkAccessEmailResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientInvalidCount, setClientInvalidCount] = useState(0);

  const { mutate: bulkCreate, isPending } = useBulkCreateAccessEmails();

  const entries = parseBulkLines(text);
  const lineCount = entries.length;

  const hasClientInvalidEmails = useMemo(() => {
    if (lineCount === 0) return false;
    return entries.some((e) => !accessEmailSchema.safeParse(e.email).success);
  }, [entries, lineCount]);

  function handleClose() {
    setText("");
    setResult(null);
    setError(null);
    setClientInvalidCount(0);
    onClose();
  }

  function handleSubmit() {
    if (lineCount === 0 || lineCount > 500) return;

    const invalid = entries.filter(
      (e) => !accessEmailSchema.safeParse(e.email).success,
    ).length;
    if (invalid > 0) {
      setClientInvalidCount(invalid);
      setError(
        `${invalid} email không hợp lệ. Kiểm tra định dạng trước khi gửi.`,
      );
      return;
    }

    setClientInvalidCount(0);
    setError(null);
    bulkCreate(entries, {
      onSuccess: (data) => setResult(data),
      onError: (err) => setError(getUserErrorMessage(err)),
    });
  }

  return (
    <AdminFormModal
      open={open}
      title="Thêm email truy cập"
      onClose={handleClose}
      maxWidth="lg"
      footer={
        result ? (
          <BrutalButton variant="primary" className="flex-1" onClick={handleClose}>
            Đóng
          </BrutalButton>
        ) : (
          <>
            <BrutalButton variant="ghost" className="flex-1" onClick={handleClose}>
              Huỷ
            </BrutalButton>
            <BrutalButton
              variant="primary"
              className="flex-1"
              onClick={handleSubmit}
              loading={isPending}
              disabled={
                lineCount === 0 || lineCount > 500 || hasClientInvalidEmails
              }
            >
              Thêm {lineCount > 0 ? `(${lineCount})` : ""}
            </BrutalButton>
          </>
        )
      }
    >
      {error && <ErrorAlert message={error} variant="inline" />}

      {!result ? (
        <>
          <p className="text-sm text-brutal-muted">
            Mỗi dòng một email, hoặc <code className="text-xs">email, ghi chú</code>.
            Tối đa 500 dòng.
          </p>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setClientInvalidCount(0);
              setError(null);
            }}
            rows={8}
            placeholder={"student@gmail.com\nstudent2@gmail.com, SE K18"}
            className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm outline-none"
            aria-label="Danh sách email"
            aria-invalid={hasClientInvalidEmails}
          />
          <p
            className={cn(
              "text-xs font-semibold tabular-nums",
              lineCount > 500 || hasClientInvalidEmails
                ? "text-brutal-danger"
                : "text-brutal-muted",
            )}
          >
            {lineCount} dòng
            {lineCount > 500 && " — vượt giới hạn 500"}
            {hasClientInvalidEmails &&
              clientInvalidCount === 0 &&
              " — có email không hợp lệ"}
            {clientInvalidCount > 0 && ` — ${clientInvalidCount} email lỗi định dạng`}
          </p>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-brutal-ink bg-brutal-bg p-3 text-sm">
            <p className="font-bold">Kết quả</p>
            <p className="mt-1 text-brutal-muted">
              Tạo mới {result.summary.created} · Kích hoạt lại{" "}
              {result.summary.reactivated} · Đã có{" "}
              {result.summary.alreadyActive} · Lỗi {result.summary.invalid}
            </p>
          </div>
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {result.results.map((r) => (
              <div
                key={r.index}
                className="flex items-center justify-between gap-2 rounded-lg border border-brutal-ink/20 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-medium">{r.email}</span>
                <span
                  className={cn(
                    "shrink-0 max-w-[50%] truncate rounded-full border px-2 py-0.5 text-xs font-bold",
                    r.status === "created" && "status-ready",
                    r.status === "reactivated" && "bg-brutal-accent/20",
                    r.status === "already_active" && "bg-brutal-bg text-brutal-muted",
                    r.status === "invalid" &&
                      "border-brutal-danger bg-brutal-danger/10 text-brutal-danger",
                  )}
                  title={r.message}
                >
                  {formatResultLabel(r.status, r.message)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminFormModal>
  );
}
