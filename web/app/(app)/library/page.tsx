"use client";

import { Globe, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";

import { LibraryBrowsePanel } from "@/components/app/library/LibraryBrowsePanel";
import {
  type LibraryFilterState,
  suggestedFiltersToQueryParams,
  browseFiltersToQueryParams,
} from "@/components/app/library/LibraryFiltersBar";
import { LibrarySuggestedPanel } from "@/components/app/library/LibrarySuggestedPanel";
import {
  LibraryTabs,
  type LibraryTabId,
} from "@/components/app/library/LibraryTabs";
import { Topbar } from "@/components/app/Topbar";
import { LoadingScreen } from "@/components/ui/Spinner";
import { useAcademicProfile } from "@/lib/queries/catalog";
import { usePublicDocuments } from "@/lib/queries/documents";
import type { PublicDocumentSort } from "@/lib/queries/public-documents";

function parseTab(value: string | null): LibraryTabId {
  if (value === "browse" || value === "library") return "browse";
  if (value === "suggested" || value === "forum") return "suggested";
  return "suggested";
}

function parseSort(
  value: string | null,
  tab: LibraryTabId,
): PublicDocumentSort {
  if (value === "newest" || value === "oldest" || value === "title") {
    return value;
  }
  return tab === "browse" ? "title" : "newest";
}

function filtersFromParams(
  params: URLSearchParams,
  tab: LibraryTabId,
): LibraryFilterState {
  return {
    curriculumId: tab === "browse" ? (params.get("curriculumId") ?? "") : "",
    semesterId: params.get("semester") ?? "",
    subjectId: params.get("subject") ?? "",
    sort: parseSort(params.get("sort"), tab),
  };
}

export interface LibraryOwnerFilter {
  id: string;
  name: string;
}

function PublicLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = parseTab(searchParams.get("tab"));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const ownerFilter = useMemo((): LibraryOwnerFilter | null => {
    const id = searchParams.get("ownerId");
    if (!id) return null;
    return {
      id,
      name: searchParams.get("ownerName")?.trim() || "người dùng này",
    };
  }, [searchParams]);

  const filtersFromUrl = useMemo(
    () => filtersFromParams(searchParams, tab),
    [searchParams, tab],
  );
  const [filters, setFilters] = useState(filtersFromUrl);
  const { data: profile } = useAcademicProfile();

  const syncUrl = useCallback(
    (
      nextTab: LibraryTabId,
      nextFilters: LibraryFilterState,
      nextPage: number,
      nextOwner: LibraryOwnerFilter | null = ownerFilter,
    ) => {
      const params = new URLSearchParams();
      if (nextTab === "browse") params.set("tab", "browse");
      if (nextTab === "browse" && nextFilters.curriculumId) {
        params.set("curriculumId", nextFilters.curriculumId);
      }
      if (nextFilters.semesterId) params.set("semester", nextFilters.semesterId);
      if (nextFilters.subjectId) params.set("subject", nextFilters.subjectId);
      if (nextFilters.sort !== (nextTab === "browse" ? "title" : "newest")) {
        params.set("sort", nextFilters.sort);
      }
      if (nextOwner) {
        params.set("ownerId", nextOwner.id);
        if (nextOwner.name) params.set("ownerName", nextOwner.name);
      }
      if (nextPage > 1) params.set("page", String(nextPage));
      const qs = params.toString();
      router.replace(qs ? `/library?${qs}` : "/library", { scroll: false });
    },
    [router, ownerFilter],
  );

  const handleTabChange = (nextTab: LibraryTabId) => {
    const nextFilters = {
      ...filters,
      curriculumId: nextTab === "suggested" ? "" : filters.curriculumId,
      sort: nextTab === "browse" ? "title" : "newest",
    } as LibraryFilterState;
    setFilters(nextFilters);
    // Owner filter only applies on browse (match=all)
    syncUrl(nextTab, nextFilters, 1, nextTab === "browse" ? ownerFilter : null);
  };

  const handleFiltersChange = (nextFilters: LibraryFilterState) => {
    setFilters(nextFilters);
    syncUrl(tab, nextFilters, 1);
  };

  const handlePageChange = (nextPage: number) => {
    syncUrl(tab, filters, nextPage);
  };

  const handleOwnerClick = (owner: LibraryOwnerFilter) => {
    const nextFilters = {
      ...filters,
      sort: "newest" as const,
    };
    setFilters(nextFilters);
    syncUrl("browse", nextFilters, 1, owner);
  };

  const clearOwnerFilter = () => {
    syncUrl(tab, filters, 1, null);
  };

  const suggestedQuery = usePublicDocuments({
    match: "auto",
    page,
    limit: 20,
    ...suggestedFiltersToQueryParams(filters, profile?.curriculum?.id),
    enabled: tab === "suggested",
  });
  const browseQuery = usePublicDocuments({
    match: "all",
    page,
    limit: 20,
    ...browseFiltersToQueryParams(filters),
    ownerId: ownerFilter?.id,
    enabled: tab === "browse",
  });

  const totalCount =
    tab === "suggested"
      ? suggestedQuery.data?.pagination?.total
      : browseQuery.data?.pagination?.total;

  return (
    <>
      <Topbar breadcrumbs={[{ label: "Thư viện công khai" }]} />

      <main className="flex-1 space-y-6 p-4 sm:p-6" id="main-content">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-accent shadow-brutal-sm">
            <Globe className="h-5 w-5 text-brutal-ink" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-brutal-ink">
              Thư viện công khai
            </h1>
            <p className="text-sm text-brutal-muted">
              Chỉ xem và tải tài liệu — không có bình luận hay thảo luận.
            </p>
          </div>
        </div>

        <LibraryTabs
          active={tab}
          onChange={handleTabChange}
          count={totalCount}
        />

        {ownerFilter && tab === "browse" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg border-2 border-brutal-ink bg-brutal-surface px-3 py-1.5 text-sm font-bold shadow-brutal-sm">
              Tài liệu của {ownerFilter.name}
              <button
                type="button"
                onClick={clearOwnerFilter}
                className="focus-brutal rounded p-0.5 hover:bg-brutal-bg"
                aria-label="Xóa lọc người đăng"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        )}

        {tab === "suggested" ? (
          <LibrarySuggestedPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            page={page}
            onPageChange={handlePageChange}
            onOwnerClick={handleOwnerClick}
          />
        ) : (
          <LibraryBrowsePanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            page={page}
            onPageChange={handlePageChange}
            ownerId={ownerFilter?.id}
            onOwnerClick={handleOwnerClick}
          />
        )}
      </main>
    </>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12">
          <LoadingScreen />
        </div>
      }
    >
      <PublicLibraryContent />
    </Suspense>
  );
}
