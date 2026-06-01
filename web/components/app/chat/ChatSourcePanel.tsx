"use client";

import { ChevronLeft, ChevronRight, FileText, Folder } from "lucide-react";
import { useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type { ChatContextType } from "@/lib/queries/chat";
import { getApiErrorMessage, useCreateSession } from "@/lib/queries/chat";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";
import { useDriveContents } from "@/lib/queries/drive";

export interface SourceSelection {
  contextType: ChatContextType;
  contextId?: string;
  label: string;
}

interface ChatSourcePanelProps {
  onSessionCreated: (sessionId: string) => void;
  compact?: boolean;
}

export function ChatSourcePanel({
  onSessionCreated,
  compact = false,
}: ChatSourcePanelProps) {
  const [contextType, setContextType] = useState<ChatContextType>("all");
  const [browseFolderId, setBrowseFolderId] = useState<string | undefined>(
    undefined,
  );
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(
    null,
  );
  const [selectedDocument, setSelectedDocument] = useState<DriveDocument | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const { data: driveContents, isLoading } = useDriveContents(browseFolderId);
  const createSession = useCreateSession();

  const canStart =
    contextType === "all" ||
    (contextType === "folder" && selectedFolder) ||
    (contextType === "document" && selectedDocument);

  async function handleStart() {
    setError(null);
    try {
      const body =
        contextType === "all"
          ? { contextType: "all" as const, title: "New conversation" }
          : contextType === "folder" && selectedFolder
            ? {
                contextType: "folder" as const,
                contextId: selectedFolder.id,
                title: `Folder: ${selectedFolder.name}`,
              }
            : contextType === "document" && selectedDocument
              ? {
                  contextType: "document" as const,
                  contextId: selectedDocument.id,
                  title: selectedDocument.title,
                }
              : null;

      if (!body) return;

      const session = await createSession.mutateAsync(body);
      onSessionCreated(session.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", compact && "text-sm")}>
      <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-brutal-muted">
        Nguồn tài liệu
      </h2>

      <div className="flex flex-col gap-1.5">
        {(
          [
            { value: "all" as const, label: "Toàn bộ tài liệu" },
            { value: "folder" as const, label: "Một folder" },
            { value: "document" as const, label: "Một tài liệu" },
          ] as const
        ).map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 transition-colors",
              contextType === opt.value
                ? "border-brutal-ink bg-brutal-bg shadow-brutal-sm"
                : "border-transparent hover:bg-brutal-bg",
            )}
          >
            <input
              type="radio"
              name="chat-context"
              value={opt.value}
              checked={contextType === opt.value}
              onChange={() => {
                setContextType(opt.value);
                setSelectedFolder(null);
                setSelectedDocument(null);
                setBrowseFolderId(undefined);
              }}
              className="accent-brutal-primary"
            />
            <span className="font-semibold text-brutal-ink">{opt.label}</span>
          </label>
        ))}
      </div>

      {contextType === "folder" && (
        <div className="space-y-2 rounded-xl border-2 border-brutal-ink/30 bg-brutal-bg p-2">
          <p className="text-xs text-brutal-muted">
            Chỉ tài liệu trực tiếp trong folder (không gồm subfolder).
          </p>
          {browseFolderId && (
            <button
              type="button"
              onClick={() => {
                setBrowseFolderId(undefined);
                setSelectedFolder(null);
              }}
              className="focus-brutal flex items-center gap-1 text-xs font-semibold text-brutal-secondary"
            >
              <ChevronLeft className="h-3 w-3" />
              Về root
            </button>
          )}
          {isLoading ? (
            <div className="skeleton h-20 w-full rounded-lg" />
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {driveContents?.folders.map((folder) => (
                <li key={folder.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedFolder(folder)}
                    className={cn(
                      "focus-brutal flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                      selectedFolder?.id === folder.id
                        ? "bg-brutal-primary/20 font-bold"
                        : "hover:bg-brutal-surface",
                    )}
                  >
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrowseFolderId(folder.id)}
                    className="focus-brutal shrink-0 rounded-lg p-1 hover:bg-brutal-surface"
                    aria-label={`Mở folder ${folder.name}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedFolder && (
            <p className="text-xs font-semibold text-brutal-accent">
              Đã chọn: {selectedFolder.name}
            </p>
          )}
        </div>
      )}

      {contextType === "document" && (
        <div className="space-y-2 rounded-xl border-2 border-brutal-ink/30 bg-brutal-bg p-2">
          {browseFolderId && (
            <button
              type="button"
              onClick={() => setBrowseFolderId(undefined)}
              className="focus-brutal flex items-center gap-1 text-xs font-semibold text-brutal-secondary"
            >
              <ChevronLeft className="h-3 w-3" />
              Về root
            </button>
          )}
          {isLoading ? (
            <div className="skeleton h-20 w-full rounded-lg" />
          ) : (
            <>
              <ul className="max-h-24 space-y-1 overflow-y-auto">
                {driveContents?.folders.map((folder) => (
                  <li key={folder.id}>
                    <button
                      type="button"
                      onClick={() => setBrowseFolderId(folder.id)}
                      className="focus-brutal flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-brutal-surface"
                    >
                      <Folder className="h-4 w-4" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-brutal-ink/20 pt-2">
                {driveContents?.documents.map((doc) => {
                  const isReady = doc.status === "ready";
                  return (
                    <li key={doc.id}>
                      <button
                        type="button"
                        disabled={!isReady}
                        onClick={() => setSelectedDocument(doc)}
                        className={cn(
                          "focus-brutal flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                          !isReady && "cursor-not-allowed opacity-50",
                          selectedDocument?.id === doc.id &&
                            "bg-brutal-primary/20 font-bold",
                          isReady && selectedDocument?.id !== doc.id &&
                            "hover:bg-brutal-surface",
                        )}
                        title={
                          !isReady
                            ? "Tài liệu chưa index AI — chỉ chọn file Ready"
                            : undefined
                        }
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          {doc.title}
                        </span>
                        <StatusBadge status={doc.status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {selectedDocument && (
            <p className="text-xs font-semibold text-brutal-accent">
              Đã chọn: {selectedDocument.title}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-brutal-danger" role="alert">
          {error}
        </p>
      )}

      <BrutalButton
        variant="primary"
        className="w-full"
        disabled={!canStart || createSession.isPending}
        loading={createSession.isPending}
        onClick={() => void handleStart()}
      >
        Bắt đầu trò chuyện
      </BrutalButton>
    </div>
  );
}
