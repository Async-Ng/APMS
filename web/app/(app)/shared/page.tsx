"use client";

import {
  ExternalLink,
  FileText,
  Folder,
  LayoutGrid,
  List,
  Share2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DocumentCard } from "@/components/app/DocumentCard";
import { FileGrid } from "@/components/app/FileGrid";
import { FolderCard } from "@/components/app/FolderCard";
import { ShareModal } from "@/components/app/ShareModal";
import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import { cn } from "@/lib/cn";
import {
  formatSharedAt,
  getResourceLabel,
  getShareWithMeLabel,
  toDriveDocument,
  toDriveFolder,
  useRevokeShare,
  useSharesByMe,
  useSharesWithMe,
  type ShareByMeGroup,
  type ShareWithMeItem,
} from "@/lib/queries/shares";

type TabId = "incoming" | "outgoing";
type IncomingView = "grid" | "list";

const TABS: { id: TabId; label: string; description: string }[] = [
  {
    id: "incoming",
    label: "Nhận được",
    description: "Thư mục và tệp người khác đã chia sẻ với bạn (chỉ đọc).",
  },
  {
    id: "outgoing",
    label: "Đã gửi",
    description: "Xem ai đang có quyền truy cập — lời mời hết hạn sau 7 ngày.",
  },
];

function ShareTabs({
  active,
  incomingCount,
  outgoingCount,
  onChange,
}: {
  active: TabId;
  incomingCount: number;
  outgoingCount: number;
  onChange: (tab: TabId) => void;
}) {
  const counts: Record<TabId, number> = {
    incoming: incomingCount,
    outgoing: outgoingCount,
  };

  return (
    <div
      className="mb-4 flex flex-wrap gap-2"
      role="tablist"
      aria-label="Chế độ xem chia sẻ"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "focus-brutal inline-flex items-center gap-2 rounded-xl border-2 border-brutal-ink px-4 py-2 text-sm font-bold transition-all",
            active === tab.id
              ? "bg-brutal-primary text-white shadow-brutal"
              : "bg-brutal-surface shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal",
          )}
        >
          {tab.label}
          {counts[tab.id] > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums",
                active === tab.id
                  ? "bg-white/20 text-white"
                  : "bg-brutal-bg text-brutal-muted",
              )}
            >
              {counts[tab.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: IncomingView;
  onChange: (view: IncomingView) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl border-2 border-brutal-ink bg-brutal-surface p-1 shadow-brutal-sm"
      role="group"
      aria-label="Cách hiển thị"
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={view === "grid"}
        className={cn(
          "focus-brutal inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
          view === "grid"
            ? "bg-brutal-primary text-white shadow-brutal-sm"
            : "text-brutal-muted hover:text-brutal-ink",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
        Lưới
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={view === "list"}
        className={cn(
          "focus-brutal inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
          view === "list"
            ? "bg-brutal-primary text-white shadow-brutal-sm"
            : "text-brutal-muted hover:text-brutal-ink",
        )}
      >
        <List className="h-3.5 w-3.5" aria-hidden="true" />
        Danh sách
      </button>
    </div>
  );
}

function ReceivedRow({ item }: { item: ShareWithMeItem }) {
  const isFolder = item.resource.type === "folder";
  const href = isFolder
    ? `/drive/${item.resource.data.id}`
    : `/documents/${item.resource.data.id}`;
  const label = getShareWithMeLabel(item);
  const iconBg =
    item.resource.type === "folder"
      ? (item.resource.data.color ?? "var(--color-fpt-orange)")
      : "#dbeafe";

  return (
    <Link
      href={href}
      className="focus-brutal flex items-center gap-3 rounded-xl border-2 border-brutal-ink bg-brutal-surface p-4 shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink shadow-brutal-sm"
        style={{ backgroundColor: iconBg }}
        aria-hidden="true"
      >
        {isFolder ? (
          <Folder className="h-6 w-6 text-white" strokeWidth={2} />
        ) : (
          <FileText className="h-6 w-6 text-brutal-secondary" strokeWidth={2} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-brutal-ink">{label}</p>
        <p className="text-xs text-brutal-muted">
          {isFolder ? "Thư mục" : "Tài liệu"} · Chia sẻ{" "}
          {formatSharedAt(item.share.sharedAt)}
        </p>
      </div>
      <span className="brutal-badge shrink-0 text-xs">
        {isFolder ? "Thư mục" : "Tệp"}
      </span>
    </Link>
  );
}

function OutgoingGroup({
  group,
  onManage,
}: {
  group: ShareByMeGroup;
  onManage: (group: ShareByMeGroup) => void;
}) {
  const { mutate: revoke, isPending } = useRevokeShare();
  const label = getResourceLabel(group);
  const isFolder = group.resourceType === "folder";
  const isDeleted = !group.resource;
  const resourceHref =
    !isDeleted && group.resource
      ? isFolder
        ? `/drive/${group.resourceId}`
        : `/documents/${group.resourceId}`
      : null;

  return (
    <BrutalCard className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isFolder ? (
            <Folder className="h-5 w-5 shrink-0 text-brutal-primary" />
          ) : (
            <FileText className="h-5 w-5 shrink-0 text-brutal-secondary" />
          )}
          {resourceHref ? (
            <Link
              href={resourceHref}
              className="focus-brutal truncate font-heading font-extrabold text-brutal-ink underline-offset-2 hover:underline"
            >
              {label}
            </Link>
          ) : (
            <p className="truncate font-heading font-extrabold text-brutal-muted">
              {label}
            </p>
          )}
          <span className="brutal-badge shrink-0 text-xs">
            {isFolder ? "Thư mục" : "Tài liệu"}
          </span>
          {isDeleted && (
            <span className="brutal-badge shrink-0 border-brutal-danger bg-red-50 text-xs text-brutal-danger">
              Mục đã xóa
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {resourceHref && (
            <Link
              href={resourceHref}
              className="focus-brutal inline-flex items-center gap-1 rounded-lg border-2 border-brutal-ink px-2 py-1 text-xs font-semibold transition-colors hover:bg-brutal-bg"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Mở
            </Link>
          )}
          {!isDeleted && (
            <BrutalButton
              variant="ghost"
              className="!py-1 !text-xs"
              onClick={() => onManage(group)}
            >
              Thêm người
            </BrutalButton>
          )}
        </div>
      </div>

      {group.shares.length === 0 ? (
        <p className="text-sm text-brutal-muted">Chưa có người nhận.</p>
      ) : (
        <ul className="space-y-2">
          {group.shares.map((share) => {
            const user = share.sharedWithUser;
            return (
              <li
                key={share.id}
                className="flex items-center gap-2 rounded-lg border-2 border-brutal-ink/30 bg-brutal-bg px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {user?.displayName ?? "Người dùng không xác định"}
                  </p>
                  <p className="truncate text-xs text-brutal-muted">
                    {user?.email ?? share.sharedWithUserId}
                    {" · "}
                    Chia sẻ {formatSharedAt(share.sharedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => revoke(share.id)}
                  className="focus-brutal shrink-0 rounded-lg border-2 border-brutal-ink px-2 py-1 text-xs font-semibold text-brutal-danger hover:bg-red-50 disabled:opacity-50"
                >
                  Thu hồi
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </BrutalCard>
  );
}

export default function SharedPage() {
  const [tab, setTab] = useState<TabId>("incoming");
  const [incomingView, setIncomingView] = useState<IncomingView>("grid");
  const [manageTarget, setManageTarget] = useState<{
    resourceType: "folder" | "document";
    resourceId: string;
    resourceName: string;
  } | null>(null);

  const received = useSharesWithMe();
  const outgoing = useSharesByMe();

  const receivedItems = received.data ?? [];
  const sharedFolderItems = receivedItems.filter(
    (item) => item.resource.type === "folder",
  );
  const sharedDocumentItems = receivedItems.filter(
    (item) => item.resource.type === "document",
  );

  const incomingCount = receivedItems.length;
  const outgoingCount = outgoing.data?.length ?? 0;

  const activeTabMeta = TABS.find((t) => t.id === tab)!;

  const incomingEmpty = !received.isLoading && incomingCount === 0;

  const outgoingEmpty =
    !outgoing.isLoading && (outgoing.data?.length ?? 0) === 0;

  const incomingError = received.isError;
  const outgoingError = outgoing.isError;

  function openManage(group: ShareByMeGroup) {
    if (!group.resource) return;
    setManageTarget({
      resourceType: group.resourceType,
      resourceId: group.resourceId,
      resourceName: getResourceLabel(group),
    });
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: "Đã chia sẻ" }]} />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        <div className="mb-6 flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-accent/30 shadow-brutal-sm"
            aria-hidden="true"
          >
            <Share2 className="h-5 w-5 text-brutal-primary" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-heading text-xl font-extrabold text-brutal-ink">
              Đã chia sẻ
            </h1>
            <p className="mt-0.5 text-sm text-brutal-muted">
              Xem nội dung được chia sẻ với bạn hoặc quản lý quyền truy cập bạn
              đã cấp cho người khác.
            </p>
          </div>
        </div>

        <ShareTabs
          active={tab}
          incomingCount={incomingCount}
          outgoingCount={outgoingCount}
          onChange={setTab}
        />

        <p className="mb-4 text-sm text-brutal-muted">
          {activeTabMeta.description}
        </p>

        {tab === "incoming" && incomingError && (
          <ErrorAlert
            className="mb-4"
            message="Không tải được mục được chia sẻ với bạn. Vui lòng thử lại."
            actionLabel="Tải lại"
            onAction={() => window.location.reload()}
          />
        )}

        {tab === "outgoing" && outgoingError && (
          <ErrorAlert
            className="mb-4"
            message="Không tải được danh sách bạn đã chia sẻ. Vui lòng thử lại."
            actionLabel="Tải lại"
            onAction={() => window.location.reload()}
          />
        )}

        {tab === "incoming" && (
          <>
            {!incomingEmpty && (
              <div className="mb-4 flex justify-end">
                <ViewToggle view={incomingView} onChange={setIncomingView} />
              </div>
            )}

            {incomingView === "grid" ? (
              received.isLoading ? (
                <FileGrid>
                  <SkeletonGrid count={6} />
                </FileGrid>
              ) : incomingEmpty ? (
                <EmptyState
                  icon={
                    <Users
                      className="h-12 w-12 text-brutal-primary"
                      strokeWidth={1.5}
                    />
                  }
                  title="Chưa có mục được chia sẻ với bạn"
                  description="Khi ai đó chia sẻ thư mục hoặc tệp với bạn, chúng sẽ hiển thị tại đây."
                />
              ) : (
                <div className="space-y-6">
                  {sharedFolderItems.length > 0 && (
                    <section aria-labelledby="shared-folders-heading">
                      <h2
                        id="shared-folders-heading"
                        className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                      >
                        Thư mục đã chia sẻ
                      </h2>
                      <FileGrid>
                        {sharedFolderItems.map((item) =>
                          item.resource.type === "folder" ? (
                            <FolderCard
                              key={item.share.id}
                              folder={toDriveFolder(item.resource.data)}
                              variant="shared"
                              sharedAt={item.share.sharedAt}
                              href={`/drive/${item.resource.data.id}?shared=1`}
                              onRename={() => {}}
                            />
                          ) : null,
                        )}
                      </FileGrid>
                    </section>
                  )}

                  {sharedDocumentItems.length > 0 && (
                    <section aria-labelledby="shared-docs-heading">
                      <h2
                        id="shared-docs-heading"
                        className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                      >
                        Tệp đã chia sẻ
                      </h2>
                      <FileGrid>
                        {sharedDocumentItems.map((item) =>
                          item.resource.type === "document" ? (
                            <DocumentCard
                              key={item.share.id}
                              document={toDriveDocument(item.resource.data)}
                              variant="shared"
                              sharedAt={item.share.sharedAt}
                              onRename={() => {}}
                            />
                          ) : null,
                        )}
                      </FileGrid>
                    </section>
                  )}
                </div>
              )
            ) : received.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : incomingEmpty ? (
              <EmptyState
                icon={
                  <Users
                    className="h-12 w-12 text-brutal-primary"
                    strokeWidth={1.5}
                  />
                }
                title="Chưa có mục được chia sẻ với bạn"
                description="Khi ai đó chia sẻ thư mục hoặc tệp với bạn, chúng sẽ hiển thị tại đây."
              />
            ) : (
              <ul className="space-y-3">
                {received.data?.map((item) => (
                  <li key={item.share.id}>
                    <ReceivedRow item={item} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "outgoing" && (
          <>
            {outgoing.isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : outgoingEmpty ? (
              <EmptyState
                icon={
                  <Share2
                    className="h-12 w-12 text-brutal-primary"
                    strokeWidth={1.5}
                  />
                }
                title="Bạn chưa chia sẻ gì"
                description="Chia sẻ thư mục hoặc tệp từ Drive của tôi bằng thao tác Chia sẻ."
              />
            ) : (
              <div className="space-y-4">
                {outgoing.data?.map((group) => (
                  <OutgoingGroup
                    key={`${group.resourceType}-${group.resourceId}`}
                    group={group}
                    onManage={openManage}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {manageTarget && (
        <ShareModal
          resourceType={manageTarget.resourceType}
          resourceId={manageTarget.resourceId}
          resourceName={manageTarget.resourceName}
          onClose={() => setManageTarget(null)}
        />
      )}
    </>
  );
}
