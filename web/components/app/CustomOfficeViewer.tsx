"use client";

interface CustomOfficeViewerProps {
  url: string;
  title?: string;
}

/**
 * Embeds Microsoft Office Online viewer for PPTX (and other Office formats).
 * Requires a publicly reachable file URL (S3 presigned GET works).
 */
export function CustomOfficeViewer({ url, title = "Presentation preview" }: CustomOfficeViewerProps) {
  const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal-sm"
      style={{ minHeight: "70vh" }}
    >
      <div className="border-b-2 border-brutal-ink bg-brutal-bg px-4 py-2">
        <p className="font-heading text-sm font-bold text-brutal-ink">{title}</p>
        <p className="text-xs text-brutal-muted">
          Xem qua Microsoft Office Online — cần kết nối internet.
        </p>
      </div>
      <iframe
        src={embedUrl}
        title={title}
        className="min-h-[65vh] w-full flex-1 border-0 bg-white"
        allowFullScreen
      />
    </div>
  );
}
