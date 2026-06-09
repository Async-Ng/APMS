"use client";

import {
  FileText,
  Folder,
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
  useSharedDrive,
  useSharesByMe,
  useSharesWithMe,
  type ShareByMeGroup,
  type ShareWithMeItem,
} from "@/lib/queries/shares";

type TabId = "browse" | "received" | "outgoing";

const TABS: { id: TabId; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "received", label: "Received" },
  { id: "outgoing", label: "Shared by me" },
];

function ShareTabs({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <div
      className="mb-6 flex flex-wrap gap-2"
      role="tablist"
      aria-label="Shared views"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "focus-brutal rounded-xl border-2 border-brutal-ink px-4 py-2 text-sm font-bold transition-all",
            active === tab.id
              ? "bg-brutal-primary text-white shadow-brutal"
              : "bg-brutal-surface shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal",
          )}
        >
          {tab.label}
        </button>
      ))}
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
          {isFolder ? "Folder" : "Document"} · Shared{" "}
          {formatSharedAt(item.share.sharedAt)}
        </p>
      </div>
      <span className="brutal-badge shrink-0 text-xs">
        {isFolder ? "Folder" : "File"}
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

  return (
    <BrutalCard className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {isFolder ? (
            <Folder className="h-5 w-5 shrink-0 text-brutal-primary" />
          ) : (
            <FileText className="h-5 w-5 shrink-0 text-brutal-secondary" />
          )}
          <p className="truncate font-heading font-extrabold text-brutal-ink">
            {label}
          </p>
          <span className="brutal-badge text-xs">
            {isFolder ? "Folder" : "Document"}
          </span>
        </div>
        {group.resource && (
          <BrutalButton
            variant="ghost"
            className="!py-1 !text-xs"
            onClick={() => onManage(group)}
          >
            Add people
          </BrutalButton>
        )}
      </div>

      {group.shares.length === 0 ? (
        <p className="text-sm text-brutal-muted">No recipients.</p>
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
                    {user?.displayName ?? "Unknown user"}
                  </p>
                  <p className="truncate text-xs text-brutal-muted">
                    {user?.email ?? share.sharedWithUserId}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => revoke(share.id)}
                  className="focus-brutal shrink-0 rounded-lg border-2 border-brutal-ink px-2 py-1 text-xs font-semibold text-brutal-danger hover:bg-red-50 disabled:opacity-50"
                >
                  Revoke
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
  const [tab, setTab] = useState<TabId>("browse");
  const [manageTarget, setManageTarget] = useState<{
    resourceType: "folder" | "document";
    resourceId: string;
    resourceName: string;
  } | null>(null);

  const browse = useSharedDrive();
  const received = useSharesWithMe();
  const outgoing = useSharesByMe();

  const activeQuery =
    tab === "browse" ? browse : tab === "received" ? received : outgoing;

  const browseEmpty =
    !browse.isLoading &&
    browse.data?.folders.length === 0 &&
    browse.data?.documents.length === 0;

  const receivedEmpty =
    !received.isLoading && (received.data?.length ?? 0) === 0;

  const outgoingEmpty =
    !outgoing.isLoading && (outgoing.data?.length ?? 0) === 0;

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
      <Topbar breadcrumbs={[{ label: "Shared" }]} onMenuOpen={() => {}} />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        <ShareTabs active={tab} onChange={setTab} />

        {activeQuery.isError && (
          <ErrorAlert
            className="mb-4"
            message="Không tải được mục đã chia sẻ. Vui lòng thử lại."
            actionLabel="Tải lại"
            onAction={() => window.location.reload()}
          />
        )}

        {tab === "browse" && (
          <>
            {browse.isLoading ? (
              <FileGrid>
                <SkeletonGrid count={6} />
              </FileGrid>
            ) : browseEmpty ? (
              <EmptyState
                icon={
                  <Users
                    className="h-12 w-12 text-brutal-primary"
                    strokeWidth={1.5}
                  />
                }
                title="Nothing shared with you"
                description="When someone shares a folder or file with you, it will appear here."
              />
            ) : (
              <div className="space-y-6">
                {(browse.data?.folders.length ?? 0) > 0 && (
                  <section aria-labelledby="shared-folders-heading">
                    <h2
                      id="shared-folders-heading"
                      className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                    >
                      Shared Folders
                    </h2>
                    <FileGrid>
                      {browse.data?.folders.map((item) => (
                        <FolderCard
                          key={item.id}
                          folder={toDriveFolder(item)}
                          variant="shared"
                          onRename={() => {}}
                        />
                      ))}
                    </FileGrid>
                  </section>
                )}

                {(browse.data?.documents.length ?? 0) > 0 && (
                  <section aria-labelledby="shared-docs-heading">
                    <h2
                      id="shared-docs-heading"
                      className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                    >
                      Shared Files
                    </h2>
                    <FileGrid>
                      {browse.data?.documents.map((item) => (
                        <DocumentCard
                          key={item.id}
                          document={toDriveDocument(item)}
                          variant="shared"
                          onRename={() => {}}
                        />
                      ))}
                    </FileGrid>
                  </section>
                )}
              </div>
            )}
          </>
        )}

        {tab === "received" && (
          <>
            {received.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : receivedEmpty ? (
              <EmptyState
                icon={
                  <Share2
                    className="h-12 w-12 text-brutal-secondary"
                    strokeWidth={1.5}
                  />
                }
                title="No shares received"
                description="Items shared with you will be listed here with dates."
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
                title="You haven't shared anything"
                description="Share folders or files from My Drive using the Share action."
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
