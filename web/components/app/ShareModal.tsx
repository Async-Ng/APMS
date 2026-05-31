"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import {
  useCreateShares,
  useRevokeShare,
  useSearchUsers,
  useSharesByMe,
  type ShareUser,
} from "@/lib/queries/shares";
import { useAuthStore } from "@/stores/auth-store";

export interface ShareModalProps {
  resourceType: "folder" | "document";
  resourceId: string;
  resourceName: string;
  onClose: () => void;
}

function getApiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (typeof message === "string") return message;
  }
  return "Something went wrong. Please try again.";
}

function UserAvatar({ user }: { user: ShareUser }) {
  const initial = user.displayName.charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-brutal-ink bg-brutal-bg text-sm font-bold text-brutal-ink"
      aria-hidden="true"
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        initial
      )}
    </div>
  );
}

export function ShareModal({
  resourceType,
  resourceId,
  resourceName,
  onClose,
}: ShareModalProps) {
  const currentUser = useAuthStore((s) => s.user);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<ShareUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: byMeGroups } = useSharesByMe();
  const createShares = useCreateShares();
  const revokeShare = useRevokeShare();

  const existingGroup = useMemo(
    () =>
      byMeGroups?.find(
        (g) => g.resourceType === resourceType && g.resourceId === resourceId,
      ),
    [byMeGroups, resourceType, resourceId],
  );

  const existingRecipients = existingGroup?.shares ?? [];

  const searchByEmail = debouncedQuery.includes("@");
  const searchParams = searchByEmail
    ? { email: debouncedQuery.trim().toLowerCase() }
    : { displayName: debouncedQuery.trim() };

  const { data: searchResults, isFetching: isSearching } = useSearchUsers(
    searchParams,
    debouncedQuery.trim().length >= 2,
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !createShares.isPending) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, createShares.isPending]);

  const isPending = createShares.isPending || revokeShare.isPending;

  const existingUserIds = new Set([
    ...existingRecipients.map((s) => s.sharedWithUserId),
    ...selectedUsers.map((u) => u.id),
    currentUser?.id ?? "",
  ]);

  const filteredResults =
    searchResults?.filter((u) => !existingUserIds.has(u.id)) ?? [];

  function addUser(user: ShareUser) {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id) ? prev : [...prev, user],
    );
    setQuery("");
    setDebouncedQuery("");
    setError(null);
  }

  function removeSelected(userId: string) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  async function handleRevoke(shareId: string) {
    setError(null);
    setSuccess(null);
    try {
      await revokeShare.mutateAsync(shareId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedUsers.length === 0) return;

    setError(null);
    setSuccess(null);

    try {
      const result = await createShares.mutateAsync({
        resourceType,
        resourceId,
        sharedWithUserIds: selectedUsers.map((u) => u.id),
      });

      const createdCount = result.created.length;
      const skippedNote =
        result.skipped > 0 ? ` (${result.skipped} skipped)` : "";

      if (createdCount === 0) {
        setError("No new shares were created. Users may already have access.");
      } else {
        setSuccess(
          `Shared with ${createdCount} user${createdCount > 1 ? "s" : ""}${skippedNote}.`,
        );
        setSelectedUsers([]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: "var(--z-modal-overlay)",
        backgroundColor: "rgba(26,26,26,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) =>
        e.target === e.currentTarget && !isPending && onClose()
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <BrutalCard
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden"
        style={{ zIndex: "var(--z-modal)" }}
      >
        <div className="flex shrink-0 items-center justify-between">
          <h2
            id="share-modal-title"
            className="font-heading text-xl font-extrabold leading-tight"
          >
            Share &ldquo;{resourceName}&rdquo;
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-brutal-ink transition-colors hover:bg-brutal-bg disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
          {/* Existing recipients */}
          {existingRecipients.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-brutal-ink">
                People with access
              </p>
              <ul className="space-y-2">
                {existingRecipients.map((share) => {
                  const user = share.sharedWithUser;
                  return (
                    <li
                      key={share.id}
                      className="flex items-center gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2"
                    >
                      {user ? (
                        <UserAvatar user={user} />
                      ) : (
                        <div className="h-9 w-9 rounded-full border-2 border-brutal-ink bg-brutal-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-brutal-ink">
                          {user?.displayName ?? "Unknown user"}
                        </p>
                        <p className="truncate text-xs text-brutal-muted">
                          {user?.email ?? share.sharedWithUserId}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRevoke(share.id)}
                        disabled={isPending}
                        className="focus-brutal rounded-lg border-2 border-brutal-ink px-2 py-1 text-xs font-semibold text-brutal-danger transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Search */}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="share-search-input"
                className="block text-sm font-semibold text-brutal-ink"
              >
                Add people
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brutal-muted"
                  aria-hidden="true"
                />
                <input
                  id="share-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setError(null);
                  }}
                  placeholder="Email or display name…"
                  className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface py-2.5 pl-10 pr-3 text-sm font-medium shadow-brutal-sm outline-none"
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-brutal-muted">
                {searchByEmail && debouncedQuery
                  ? "Exact email match"
                  : "Partial name match (min 2 characters)"}
              </p>
            </div>

            {/* Search results */}
            {debouncedQuery.trim().length >= 2 && (
              <div className="max-h-40 overflow-y-auto rounded-xl border-2 border-brutal-ink bg-brutal-surface">
                {isSearching ? (
                  <p className="px-3 py-2 text-sm text-brutal-muted">Searching…</p>
                ) : filteredResults.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-brutal-muted">
                    No users found.
                  </p>
                ) : (
                  <ul>
                    {filteredResults.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => addUser(user)}
                          className="focus-brutal flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-brutal-bg"
                        >
                          <UserAvatar user={user} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {user.displayName}
                            </p>
                            <p className="truncate text-xs text-brutal-muted">
                              {user.email}
                            </p>
                          </div>
                          <UserPlus className="ml-auto h-4 w-4 shrink-0 text-brutal-primary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Selected chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 rounded-full border-2 border-brutal-ink bg-brutal-accent/30 px-2 py-1 text-xs font-semibold"
                  >
                    {user.displayName}
                    <button
                      type="button"
                      onClick={() => removeSelected(user.id)}
                      className="focus-brutal rounded-full p-0.5 hover:bg-brutal-bg"
                      aria-label={`Remove ${user.displayName}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs font-medium text-brutal-danger">
                {error}
              </p>
            )}
            {success && (
              <p
                role="status"
                className="text-xs font-medium text-brutal-accent"
              >
                {success}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <BrutalButton
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </BrutalButton>
              <BrutalButton
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={isPending || selectedUsers.length === 0}
              >
                {isPending ? "Sharing…" : "Share"}
              </BrutalButton>
            </div>
          </form>
        </div>
      </BrutalCard>
    </div>
  );
}
