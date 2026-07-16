"use client";

import {
  ArrowLeft,
  Download,
  Edit3,
  FileText,
  Globe,
  Lock,
  Presentation,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useMemo, useState } from "react";

import { AskAiLink } from "@/components/app/AskAiLink";
import { DocumentSettingsModal } from "@/components/app/DocumentSettingsModal";
import { ShareModal } from "@/components/app/ShareModal";
import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CustomDocxViewer } from "@/components/app/CustomDocxViewer";
import { CustomOfficeViewer } from "@/components/app/CustomOfficeViewer";
import { CustomPdfViewer } from "@/components/app/CustomPdfViewer";
import { CustomPptxTextViewer } from "@/components/app/CustomPptxTextViewer";
import { cn } from "@/lib/cn";
import { buildDocumentBreadcrumbs } from "@/lib/drive/document-breadcrumbs";
import { findSlotInCatalog } from "@/lib/drive/semester-view";
import {
  canPreviewInBrowser,
  isDocxMime,
  isPdfMime,
  isPptxMime,
  mimeLabel,
} from "@/lib/mime";
import {
  useCitationContext,
  useDeleteDocument,
  useDocumentDownloadUrl,
  useToggleDocumentStar,
} from "@/lib/queries/documents";
import { useDocument } from "@/lib/queries/documents";
import { useAcademicProfile, useCatalogCourseSlots } from "@/lib/queries/catalog";
import { useFolderPath } from "@/lib/queries/drive";
import { useAuthStore } from "@/stores/auth-store";

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

/* ── non-previewable placeholder ───────────────────────────── */

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

function DocumentDetailContent({ documentId }: { documentId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const pageParam = searchParams.get("page");
  const chunkIndexParam = searchParams.get("chunkIndex");
  const citationPage =
    pageParam && /^\d+$/.test(pageParam) ? Number.parseInt(pageParam, 10) : undefined;
  const citationChunkIndex =
    chunkIndexParam && /^\d+$/.test(chunkIndexParam)
      ? Number.parseInt(chunkIndexParam, 10)
      : null;
  const currentUser = useAuthStore((s) => s.user);

  const { data: doc, isLoading, isError } = useDocument(documentId);
  const isShared = from === "shared";
  const { data: folderPath, isLoading: isFolderPathLoading } = useFolderPath(
    doc?.folderId,
    { shared: isShared },
  );
  const { data: profile } = useAcademicProfile();
  const { data: catalog } = useCatalogCourseSlots(profile?.curriculum?.id);
  const courseSlot = useMemo(
    () =>
      doc?.courseSlotId
        ? findSlotInCatalog(catalog, doc.courseSlotId)
        : undefined,
    [catalog, doc?.courseSlotId],
  );
  const [fetchUrl, setFetchUrl] = useState(false);
  const { data: withUrl } = useDocumentDownloadUrl(documentId, fetchUrl);
  const {
    data: citationContext,
    isError: isCitationContextError,
    isLoading: isCitationContextLoading,
  } = useCitationContext(documentId, citationChunkIndex);

  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { mutate: toggleStar } = useToggleDocumentStar();
  const { mutate: deleteDoc } = useDeleteDocument(documentId);

  const isOwner = !!doc && !!currentUser && doc.ownerId === currentUser.id;

  const downloadUrl = withUrl?.downloadUrl;
  const canPreview = doc ? canPreviewInBrowser(doc.mimeType) : false;
  const isPdf = isPdfMime(doc?.mimeType);
  const isDocx = isDocxMime(doc?.mimeType);
  const isPptx = isPptxMime(doc?.mimeType);

  // Fetch presigned URL for any in-browser preview (PDF, DOCX, PPTX)
  if (!fetchUrl && doc && canPreview && doc.status !== "pending") {
    setFetchUrl(true);
  }

  function renderViewer() {
    if (!doc) return null;

    if (fetchUrl && !downloadUrl) {
      return (
        <div className="flex items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg py-24">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
            <p className="text-sm text-brutal-muted">Đang tải tài liệu…</p>
          </div>
        </div>
      );
    }

    if (!downloadUrl || !canPreview) {
      return <NoPreview mimeType={doc.mimeType} onDownload={handleDownload} />;
    }

    if (isPdf) {
      return (
        <CustomPdfViewer
          url={downloadUrl}
          initialPage={citationContext?.pageNumber ?? citationPage}
          citationContext={citationContext}
        />
      );
    }
    if (isDocx) {
      return (
        <CustomDocxViewer
          url={downloadUrl}
          citationContext={citationContext}
        />
      );
    }
    if (isPptx) {
      if (citationChunkIndex != null && isCitationContextLoading) {
        return (
          <div className="flex items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg py-24">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
              <p className="text-sm text-brutal-muted">Đang tải nguồn trích dẫn...</p>
            </div>
          </div>
        );
      }

      if (citationContext) {
        return (
          <CustomPptxTextViewer
            citationContext={citationContext}
            originalUrl={downloadUrl}
          />
        );
      }

      return (
        <CustomOfficeViewer
          url={downloadUrl}
          title="Xem trước PowerPoint"
        />
      );
    }

    return <NoPreview mimeType={doc.mimeType} onDownload={handleDownload} />;
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

  const backHref =
    from === "public"
      ? "/library"
      : from === "shared"
        ? "/shared"
        : doc?.folderId
          ? `/drive/${doc.folderId}`
          : "/drive";

  const breadcrumbs = buildDocumentBreadcrumbs({
    from,
    doc,
    isLoading,
    folderPath,
    isFolderPathLoading,
    courseSlot,
  });

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(backHref);
  }

  return (
    <>
      <Topbar
        breadcrumbs={breadcrumbs}
      />

      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6" id="main-content">
        {/* Error */}
        {isError && (
          <ErrorAlert message="Không tải được tài liệu. Vui lòng thử lại." />
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            <div className="skeleton h-16 w-full rounded-xl" />
            <div className="skeleton h-[70vh] w-full rounded-xl" />
          </div>
        )}

        {doc && (
          <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start">
            {/* ── Left: viewer ─────────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden">
              {/* Back + title row */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="focus-brutal flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal active:translate-y-0.5 active:shadow-[0_0_0_#1A1A1A]"
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h1 className="font-heading text-xl font-extrabold leading-tight text-brutal-ink truncate">
                  {doc.title}
                </h1>
              </div>

              {renderViewer()}
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
              {from === "chat" && citationChunkIndex != null && (
                <>
                  <div className="rounded-xl border-2 border-brutal-ink bg-brutal-bg p-3 text-sm">
                    <p className="font-heading text-xs font-extrabold uppercase tracking-widest text-brutal-muted">
                      Nguồn trích dẫn
                    </p>
                    {isCitationContextLoading && (
                      <p className="mt-2 text-xs text-brutal-muted">
                        Đang tải nguồn trích dẫn...
                      </p>
                    )}
                    {isCitationContextError && (
                      <p className="mt-2 text-xs font-semibold text-brutal-danger">
                        Nguồn không còn khả dụng.
                      </p>
                    )}
                    {citationContext && (
                      <div className="mt-2 space-y-2">
                        {(citationContext.heading ||
                          citationContext.pageNumber != null) && (
                          <p className="text-xs font-semibold text-brutal-muted">
                            {[
                              citationContext.heading,
                              citationContext.pageNumber != null
                                ? `Trang ${citationContext.pageNumber}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                        {citationContext.sectionPath.length > 0 && (
                          <p className="text-xs text-brutal-muted">
                            {citationContext.sectionPath.join(" › ")}
                          </p>
                        )}
                        <blockquote className="max-h-40 overflow-y-auto rounded-lg border border-brutal-ink/30 bg-brutal-surface p-2 text-xs leading-relaxed text-brutal-ink">
                          {citationContext.excerpt}
                        </blockquote>
                      </div>
                    )}
                  </div>

                  <hr className="my-4 border-brutal-ink/20" />
                </>
              )}

              {/* Metadata rows */}
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-brutal-muted">Trạng thái</dt>
                  <dd>
                    <StatusBadge status={doc.status} createdAt={doc.createdAt} />
                  </dd>
                </div>
                {doc.visibility && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-brutal-muted">Quyền hiển thị</dt>
                    <dd>
                      <span className="inline-flex items-center gap-1 rounded-md border-2 border-brutal-ink bg-brutal-bg px-2 py-0.5 text-xs font-bold">
                        {doc.visibility === "public" ? (
                          <>
                            <Globe className="h-3 w-3" /> Công khai
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" /> Riêng tư
                          </>
                        )}
                      </span>
                    </dd>
                  </div>
                )}
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
                    <dt className="text-brutal-muted">Thẻ</dt>
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

                <AskAiLink
                  id={`doc-${documentId}-ask-ai-btn`}
                  href={`/chat?contextType=document&contextId=${documentId}`}
                  layout="block"
                />

                {isOwner && (
                  <>
                    <BrutalButton
                      id={`doc-${documentId}-edit-btn`}
                      variant="ghost"
                      className="w-full"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Edit3 className="h-4 w-4" />
                      Chỉnh sửa
                    </BrutalButton>

                    <BrutalButton
                      id={`doc-${documentId}-share-btn`}
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShareOpen(true)}
                    >
                      <Share2 className="h-4 w-4" />
                      Chia sẻ
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
                  </>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      {shareOpen && doc && (
        <ShareModal
          resourceType="document"
          resourceId={doc.id}
          resourceName={doc.title}
          onClose={() => setShareOpen(false)}
        />
      )}

      {settingsOpen && doc && (
        <DocumentSettingsModal
          document={doc}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}

export default function DocumentDetailPage({ params }: PageProps) {
  const { documentId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
        </div>
      }
    >
      <DocumentDetailContent documentId={documentId} />
    </Suspense>
  );
}
