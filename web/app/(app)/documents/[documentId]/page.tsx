"use client";

import {
  ArrowLeft,
  Download,
  FileText,
  Presentation,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CustomPdfViewer } from "@/components/app/CustomPdfViewer";
import { cn } from "@/lib/cn";
import {
  useDeleteDocument,
  useDocumentDownloadUrl,
  useToggleDocumentStar,
} from "@/lib/queries/documents";
import { useDocument } from "@/lib/queries/documents";

/* ── helpers ────────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FileTypeIcon({ mimeType, size = 40 }: { mimeType: string; size?: number }) {
  const cls = `shrink-0 text-white`;
  const style = { width: size, height: size };

  if (mimeType.includes("pdf"))
    return <FileText className={cls} style={style} strokeWidth={1.5} />;
  if (mimeType.includes("presentation"))
    return <Presentation className={cls} style={style} strokeWidth={1.5} />;
  return <FileText className={cls} style={style} strokeWidth={1.5} />;
}

function fileIconBg(mimeType: string) {
  if (mimeType.includes("pdf")) return "var(--color-brutal-danger)";
  if (mimeType.includes("presentation")) return "var(--color-brutal-primary)";
  return "var(--color-brutal-secondary)";
}

function mimeLabel(mimeType: string) {
  if (mimeType.includes("pdf")) return "PDF Document";
  if (mimeType.includes("presentation")) return "PowerPoint Presentation";
  if (mimeType.includes("word")) return "Word Document";
  return "Document";
}



/* ── non-PDF preview placeholder ───────────────────────────── */

function NoPreview({
  mimeType,
  onDownload,
}: {
  mimeType: string;
  onDownload: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 rounded-xl border-2 border-brutal-ink bg-brutal-bg py-24 shadow-brutal-sm">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-brutal-ink shadow-brutal"
        style={{ backgroundColor: fileIconBg(mimeType) }}
      >
        <FileTypeIcon mimeType={mimeType} size={44} />
      </div>
      <div className="text-center">
        <p className="font-heading text-lg font-extrabold text-brutal-ink">
          Preview không khả dụng
        </p>
        <p className="mt-1 text-sm text-brutal-muted">
          {mimeLabel(mimeType)} không hỗ trợ xem trước trực tiếp.
          <br />
          Tải xuống để mở bằng ứng dụng tương ứng.
        </p>
      </div>
      <BrutalButton variant="primary" onClick={onDownload}>
        <Download className="h-4 w-4" />
        Tải xuống
      </BrutalButton>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────── */

interface PageProps {
  params: Promise<{ documentId: string }>;
}

export default function DocumentDetailPage({ params }: PageProps) {
  const { documentId } = use(params);
  const router = useRouter();

  const { data: doc, isLoading, isError } = useDocument(documentId);
  const [fetchUrl, setFetchUrl] = useState(false);
  const { data: withUrl } = useDocumentDownloadUrl(documentId, fetchUrl);

  const { mutate: toggleStar } = useToggleDocumentStar();
  const { mutate: deleteDoc } = useDeleteDocument(documentId);

  const isPdf = doc?.mimeType.includes("pdf");
  const downloadUrl = withUrl?.downloadUrl;

  // Tự động fetch URL khi trang load (để PDF hiển thị ngay)
  if (!fetchUrl && doc && doc.status !== "pending") {
    setFetchUrl(true);
  }

  function handleDownload() {
    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = doc?.originalFilename ?? "document";
      a.click();
    } else {
      setFetchUrl(true);
    }
  }

  const breadcrumbs = [
    { label: "My Drive", href: "/drive" },
    { label: isLoading ? "…" : (doc?.title ?? "Document") },
  ];

  return (
    <>
      <Topbar
        breadcrumbs={breadcrumbs}
        onMenuOpen={() => {}}
      />

      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6" id="main-content">
        {/* Error */}
        {isError && (
          <div className="rounded-xl border-2 border-brutal-ink bg-red-50 px-4 py-3 text-sm font-medium text-brutal-danger">
            Không thể tải tài liệu. Vui lòng thử lại.
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            <div className="skeleton h-16 w-full rounded-xl" />
            <div className="skeleton h-[70vh] w-full rounded-xl" />
          </div>
        )}

        {doc && (
          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-start">
            {/* ── Left: viewer ─────────────────────────────── */}
            <div className="flex flex-1 flex-col gap-3">
              {/* Back + title row */}
              <div className="flex items-center gap-3">
                <Link
                  href={doc.folderId ? `/drive/${doc.folderId}` : "/drive"}
                  className="focus-brutal flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal active:translate-y-0.5 active:shadow-[0_0_0_#1A1A1A]"
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="font-heading text-xl font-extrabold leading-tight text-brutal-ink truncate">
                  {doc.title}
                </h1>
              </div>

              {/* Viewer area */}
              {isPdf && downloadUrl ? (
                <CustomPdfViewer url={downloadUrl} />
              ) : (
                <NoPreview mimeType={doc.mimeType} onDownload={handleDownload} />
              )}

              {/* Loading indicator for URL fetch */}
              {fetchUrl && !downloadUrl && isPdf && (
                <div className="flex items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg py-24">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
                    <p className="text-sm text-brutal-muted">
                      Đang tải tài liệu…
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: metadata panel ─────────────────────── */}
            <aside
              className="brutal-card w-full p-5 lg:w-72 lg:shrink-0"
              aria-label="Thông tin tài liệu"
            >
              {/* File icon + name */}
              <div className="flex items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink shadow-brutal-sm"
                  style={{ backgroundColor: fileIconBg(doc.mimeType) }}
                  aria-hidden="true"
                >
                  <FileTypeIcon mimeType={doc.mimeType} size={24} />
                </div>
                <div className="min-w-0">
                  <p className="break-words font-bold leading-tight text-brutal-ink">
                    {doc.title}
                  </p>
                  <p className="mt-0.5 text-xs text-brutal-muted">
                    {mimeLabel(doc.mimeType)}
                  </p>
                </div>
              </div>

              <hr className="my-4 border-brutal-ink/20" />

              {/* Metadata rows */}
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-brutal-muted">Trạng thái</dt>
                  <dd>
                    <StatusBadge status={doc.status} />
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-brutal-muted">Kích thước</dt>
                  <dd className="font-semibold tabular-nums text-brutal-ink">
                    {formatBytes(doc.fileSizeBytes)}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-brutal-muted">Tên file gốc</dt>
                  <dd className="break-all font-medium text-brutal-ink text-xs">
                    {doc.originalFilename}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-brutal-muted">Đã upload</dt>
                  <dd className="text-right font-medium text-brutal-ink">
                    {formatDate(doc.createdAt)}
                  </dd>
                </div>
                {doc.tags.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <dt className="text-brutal-muted">Tags</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="brutal-badge !text-xs !px-2 !py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>

              <hr className="my-4 border-brutal-ink/20" />

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <BrutalButton
                  id={`doc-${documentId}-download-btn`}
                  variant="primary"
                  className="w-full"
                  onClick={handleDownload}
                  disabled={doc.status === "pending"}
                >
                  <Download className="h-4 w-4" />
                  Tải xuống
                </BrutalButton>

                <BrutalButton
                  id={`doc-${documentId}-star-btn`}
                  variant={doc.isStarred ? "secondary" : "ghost"}
                  className="w-full"
                  onClick={() =>
                    toggleStar({
                      documentId: doc.id,
                      starred: !doc.isStarred,
                    })
                  }
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      doc.isStarred && "fill-current",
                    )}
                  />
                  {doc.isStarred ? "Bỏ đánh dấu" : "Đánh dấu sao"}
                </BrutalButton>

                <BrutalButton
                  id={`doc-${documentId}-trash-btn`}
                  variant="ghost"
                  className="w-full !text-brutal-danger hover:!bg-red-50"
                  onClick={() => {
                    deleteDoc();
                    router.back();
                  }}
                >
                  <Trash2 className="h-4 w-4 text-brutal-danger" />
                  Chuyển vào Thùng rác
                </BrutalButton>
              </div>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
