"use client";

import {
  ArrowLeft,
  Download,
  FileText,
  Presentation,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useState } from "react";

import { AskAiLink } from "@/components/app/AskAiLink";
import { MatchTypeBadge, isForumDocument } from "@/components/app/forum/MatchTypeBadge";
import { CustomDocxViewer } from "@/components/app/CustomDocxViewer";
import { CustomOfficeViewer } from "@/components/app/CustomOfficeViewer";
import { CustomPdfViewer } from "@/components/app/CustomPdfViewer";
import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  canPreviewInBrowser,
  isDocxMime,
  isPdfMime,
  isPptxMime,
  mimeLabel,
} from "@/lib/mime";
import { useForumDocument } from "@/lib/queries/forum";
import { useLibraryDocument } from "@/lib/queries/library";
import type { InternalDocument, InternalSource } from "@/lib/queries/internal-documents";

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
  const style = { width: size, height: size };
  if (mimeType.includes("presentation"))
    return (
      <Presentation className="shrink-0 text-white" style={style} strokeWidth={1.5} />
    );
  return <FileText className="shrink-0 text-white" style={style} strokeWidth={1.5} />;
}

function fileIconBg(mimeType: string) {
  if (mimeType.includes("pdf")) return "var(--color-brutal-danger)";
  if (mimeType.includes("presentation")) return "var(--color-brutal-primary)";
  return "var(--color-brutal-secondary)";
}

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
          Xem trước không khả dụng
        </p>
        <p className="mt-1 text-sm text-brutal-muted">
          {mimeLabel(mimeType)} — tải xuống để mở bằng ứng dụng phù hợp.
        </p>
      </div>
      <BrutalButton variant="primary" onClick={onDownload}>
        <Download className="h-4 w-4" />
        Tải xuống
      </BrutalButton>
    </div>
  );
}

function useInternalDocument(
  documentId: string,
  source: InternalSource,
  download: boolean,
) {
  const forum = useForumDocument(documentId, {
    download,
    enabled: source === "forum",
  });
  const library = useLibraryDocument(documentId, {
    download,
    enabled: source === "library",
  });
  return source === "forum" ? forum : library;
}

function InternalDocumentDetailContent({
  documentId,
}: {
  documentId: string;
}) {
  const searchParams = useSearchParams();
  const source: InternalSource =
    searchParams.get("source") === "library" ? "library" : "forum";
  const backHref =
    source === "library" ? "/forum?tab=library" : "/forum";

  const { data: doc, isLoading, isError } = useInternalDocument(
    documentId,
    source,
    false,
  );
  const [fetchUrl, setFetchUrl] = useState(false);
  const { data: withUrl } = useInternalDocument(documentId, source, fetchUrl);

  const downloadUrl = withUrl?.downloadUrl;
  const canPreview = doc ? canPreviewInBrowser(doc.mimeType) : false;
  const isPdf = isPdfMime(doc?.mimeType);
  const isDocx = isDocxMime(doc?.mimeType);
  const isPptx = isPptxMime(doc?.mimeType);

  useEffect(() => {
    if (!fetchUrl && doc && canPreview && doc.status === "ready") {
      setFetchUrl(true);
    }
  }, [fetchUrl, doc, canPreview]);

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

  function renderViewer(docItem: InternalDocument) {
    if (docItem.status === "processing") {
      return (
        <div className="rounded-xl border-2 border-brutal-ink bg-brutal-accent/20 px-6 py-16 text-center">
          <p className="font-heading font-extrabold">Đang xử lý tài liệu</p>
          <p className="mt-2 text-sm text-brutal-muted">
            Vui lòng quay lại sau khi tài liệu sẵn sàng.
          </p>
        </div>
      );
    }

    if (docItem.status === "failed") {
      return (
        <ErrorAlert message="Tài liệu xử lý thất bại. Bạn vẫn có thể thử tải xuống nếu file đã có trên hệ thống." />
      );
    }

    if (fetchUrl && !downloadUrl) {
      return (
        <div className="flex items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
        </div>
      );
    }

    if (!downloadUrl || !canPreview) {
      return (
        <NoPreview mimeType={docItem.mimeType} onDownload={handleDownload} />
      );
    }

    if (isPdf) return <CustomPdfViewer url={downloadUrl} />;
    if (isDocx) return <CustomDocxViewer url={downloadUrl} />;
    if (isPptx) {
      return (
        <CustomOfficeViewer url={downloadUrl} title="Xem trước PowerPoint" />
      );
    }

    return (
      <NoPreview mimeType={docItem.mimeType} onDownload={handleDownload} />
    );
  }

  const course = doc?.curriculumCourse;

  return (
    <>
      <Topbar
        breadcrumbs={[
          { label: "Tài liệu nội bộ", href: backHref },
          { label: isLoading ? "…" : (doc?.title ?? "Chi tiết") },
        ]}
        onMenuOpen={() => {}}
      />

      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6" id="main-content">
        {isError && (
          <div className="space-y-4">
            <ErrorAlert message="Không tải được tài liệu. Có thể đã bị xóa hoặc bạn không có quyền truy cập." />
            <Link
              href={backHref}
              className="focus-brutal inline-flex items-center gap-2 font-bold underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Link>
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            <div className="skeleton h-16 w-full rounded-xl" />
            <div className="skeleton h-[70vh] w-full rounded-xl" />
          </div>
        )}

        {doc && (
          <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden">
              <div className="flex items-center gap-3">
                <Link
                  href={backHref}
                  className="focus-brutal flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal"
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="truncate font-heading text-xl font-extrabold text-brutal-ink">
                  {doc.title}
                </h1>
              </div>
              {renderViewer(doc)}
            </div>

            <aside
              className="brutal-card w-full p-5 lg:w-72 lg:shrink-0"
              aria-label="Thông tin tài liệu"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink shadow-brutal-sm"
                  style={{ backgroundColor: fileIconBg(doc.mimeType) }}
                >
                  <FileTypeIcon mimeType={doc.mimeType} size={24} />
                </div>
                <div className="min-w-0">
                  <p className="break-words font-bold leading-tight">{doc.title}</p>
                  <p className="mt-0.5 text-xs text-brutal-muted">
                    {mimeLabel(doc.mimeType)}
                  </p>
                </div>
              </div>

              <hr className="my-4 border-brutal-ink/20" />

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-brutal-muted">Trạng thái</dt>
                  <dd>
                    <StatusBadge status={doc.status} />
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-brutal-muted">Kích thước</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatBytes(doc.fileSizeBytes)}
                  </dd>
                </div>
                {doc.owner && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-brutal-muted">Người đăng</dt>
                    <dd className="text-right font-medium">{doc.owner.displayName}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-brutal-muted">Ngày đăng</dt>
                  <dd className="text-right font-medium">{formatDate(doc.createdAt)}</dd>
                </div>
                {source === "forum" && isForumDocument(doc) && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-brutal-muted">Mức khớp</dt>
                    <dd>
                      <MatchTypeBadge matchType={doc.matchType} />
                    </dd>
                  </div>
                )}
                {course && (
                  <div className="flex flex-col gap-1.5">
                    <dt className="text-brutal-muted">Học thuật</dt>
                    <dd className="flex flex-wrap gap-1">
                      {course.major && (
                        <span className="rounded-md border border-brutal-ink bg-brutal-bg px-2 py-0.5 text-xs font-bold">
                          {course.major.code}
                        </span>
                      )}
                      <span className="rounded-md border border-brutal-ink bg-brutal-accent/20 px-2 py-0.5 text-xs font-bold">
                        HK {course.semesterNumber}
                      </span>
                      {course.subject && (
                        <span className="rounded-md border border-brutal-ink px-2 py-0.5 text-xs font-bold">
                          {course.subject.code}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.map((tag) => (
                      <span key={tag} className="brutal-badge !text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </dl>

              <hr className="my-4 border-brutal-ink/20" />

              <div className="flex flex-col gap-2">
                <BrutalButton
                  variant="primary"
                  className="w-full"
                  onClick={handleDownload}
                  disabled={doc.status === "pending"}
                >
                  <Download className="h-4 w-4" />
                  Tải xuống
                </BrutalButton>
                <AskAiLink
                  href={`/chat?contextType=document&contextId=${documentId}`}
                  layout="block"
                />
              </div>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

interface PageProps {
  params: Promise<{ documentId: string }>;
}

export default function InternalDocumentDetailPage({ params }: PageProps) {
  const { documentId } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
        </div>
      }
    >
      <InternalDocumentDetailContent documentId={documentId} />
    </Suspense>
  );
}
