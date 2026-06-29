"use client";

import { Globe } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";

import { ForumFeedPanel } from "@/components/app/forum/ForumFeedPanel";
import {
  type ForumFilterState,
  forumFiltersToQueryParams,
  libraryFiltersToQueryParams,
} from "@/components/app/forum/ForumFiltersBar";
import {
  ForumLibraryTabs,
  type ForumLibraryTabId,
} from "@/components/app/forum/ForumLibraryTabs";
import { LibraryBrowsePanel } from "@/components/app/forum/LibraryBrowsePanel";
import { Topbar } from "@/components/app/Topbar";
import { LoadingScreen } from "@/components/ui/Spinner";
import type { InternalDocumentSort } from "@/lib/queries/internal-documents";
import { usePublicDocuments } from "@/lib/queries/documents";

function parseTab(value: string | null): ForumLibraryTabId {
  if (value === "library") return "library";
  if (value === "suggested" || value === "forum") return "suggested";
  return "suggested";
}

function parseSort(
  value: string | null,
  tab: ForumLibraryTabId,
): InternalDocumentSort {
  if (value === "newest" || value === "oldest" || value === "title") {
    return value;
  }
  return tab === "library" ? "title" : "newest";
}

function filtersFromParams(
  params: URLSearchParams,
  tab: ForumLibraryTabId,
): ForumFilterState {
  return {
    search: params.get("q") ?? "",
    majorId: params.get("majorId") ?? "",
    semesterId: params.get("semester") ?? "",
    subjectId: params.get("subject") ?? "",
    sort: parseSort(params.get("sort"), tab),
  };
}

function PublicLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = parseTab(searchParams.get("tab"));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const filters = useMemo(
    () => filtersFromParams(searchParams, tab),
    [searchParams, tab],
  );

  const [localFilters, setLocalFilters] = useState<ForumFilterState | null>(null);
  const activeFilters = localFilters ?? filters;

  const syncUrl = useCallback(
    (
      nextTab: ForumLibraryTabId,
      nextFilters: ForumFilterState,
      nextPage: number,
    ) => {
      const params = new URLSearchParams();
      if (nextTab === "library") params.set("tab", "library");
      if (nextFilters.search) params.set("q", nextFilters.search);
      if (nextTab === "library") {
        if (nextFilters.majorId) params.set("majorId", nextFilters.majorId);
        if (nextFilters.semesterId)
          params.set("semester", nextFilters.semesterId);
        if (nextFilters.subjectId) params.set("subject", nextFilters.subjectId);
      }
      if (nextFilters.sort !== (nextTab === "library" ? "title" : "newest")) {
        params.set("sort", nextFilters.sort);
      }
      if (nextPage > 1) params.set("page", String(nextPage));
      const qs = params.toString();
      router.replace(qs ? `/library?${qs}` : "/library", { scroll: false });
      setLocalFilters(null);
    },
    [router],
  );

  const handleTabChange = (nextTab: ForumLibraryTabId) => {
    const nextFilters = {
      ...activeFilters,
      sort: nextTab === "library" ? "title" : "newest",
      ...(nextTab === "suggested"
        ? { majorId: "", semesterId: "", subjectId: "" }
        : {}),
    } as ForumFilterState;
    syncUrl(nextTab, nextFilters, 1);
  };

  const handleFiltersChange = (nextFilters: ForumFilterState) => {
    setLocalFilters(nextFilters);
    syncUrl(tab, nextFilters, 1);
  };

  const handlePageChange = (nextPage: number) => {
    syncUrl(tab, activeFilters, nextPage);
  };

  const suggestedQuery = usePublicDocuments({
    match: "auto",
    page,
    limit: 20,
    ...forumFiltersToQueryParams(activeFilters),
    enabled: tab === "suggested",
  });
  const libraryQuery = usePublicDocuments({
    match: "all",
    page,
    limit: 20,
    ...libraryFiltersToQueryParams(activeFilters),
    enabled: tab === "library",
  });

  const totalCount =
    tab === "suggested"
      ? suggestedQuery.data?.pagination?.total
      : libraryQuery.data?.pagination?.total;

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

        <ForumLibraryTabs
          active={tab}
          onChange={handleTabChange}
          count={totalCount}
        />

        {tab === "suggested" ? (
          <ForumFeedPanel
            filters={activeFilters}
            onFiltersChange={handleFiltersChange}
            page={page}
            onPageChange={handlePageChange}
          />
        ) : (
          <LibraryBrowsePanel
            filters={activeFilters}
            onFiltersChange={handleFiltersChange}
            page={page}
            onPageChange={handlePageChange}
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
