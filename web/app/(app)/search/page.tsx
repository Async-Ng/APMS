"use client";

import { FileText, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AskAiLink } from "@/components/app/AskAiLink";
import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { LoadingScreen } from "@/components/ui/Spinner";
import { useSemanticSearch } from "@/lib/queries/search";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [input, setInput] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);

  const { data: results, isLoading, isError, error } = useSemanticSearch(query);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    setQuery(trimmed);
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    router.replace(params.toString() ? `/search?${params}` : "/search", {
      scroll: false,
    });
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: "Tìm kiếm" }]} showSearch={false} />

      <main className="mx-auto flex-1 space-y-6 p-4 sm:max-w-3xl sm:p-6" id="main-content">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-brutal-ink">
            Tìm tài liệu
          </h1>
          <p className="mt-1 text-sm text-brutal-muted">
            Gõ câu hỏi hoặc cụm từ — hệ thống tìm theo nội dung trong tài liệu bạn được xem.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brutal-muted"
              aria-hidden
            />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ví dụ: slide tuần 5 lập trình hướng đối tượng"
              className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface py-3 pl-10 pr-3 text-sm shadow-brutal-sm outline-none placeholder:text-brutal-muted"
              data-initial-focus
            />
          </div>
          <BrutalButton type="submit" variant="primary" className="shrink-0 !w-auto">
            Tìm
          </BrutalButton>
        </form>

        {!query.trim() && (
          <EmptyState
            icon={<Search className="h-12 w-12 text-brutal-secondary" strokeWidth={1.5} />}
            title="Bạn đang tìm gì?"
            description="Thử mô tả bài học, tên môn hoặc nội dung slide — không cần nhớ đúng tên file."
          />
        )}

        {query.trim().length > 0 && query.trim().length < 2 && (
          <p className="text-sm text-brutal-muted">Nhập ít nhất 2 ký tự để tìm.</p>
        )}

        {isLoading && query.trim().length >= 2 && (
          <div className="flex justify-center py-12">
            <LoadingScreen message="Đang tìm trong tài liệu của bạn…" />
          </div>
        )}

        {isError && (
          <ErrorAlert
            message={
              error instanceof Error
                ? error.message
                : "Không tìm được lúc này — thử lại sau vài giây."
            }
          />
        )}

        {results && results.length === 0 && query.trim().length >= 2 && !isLoading && (
          <EmptyState
            title="Không thấy tài liệu phù hợp"
            description="Thử từ khóa khác, hoặc kiểm tra bạn đã tải / được chia sẻ tài liệu đó chưa."
          />
        )}

        {results && results.length > 0 && (
          <ul className="space-y-3">
            {results.map((item) => (
              <li key={`${item.documentId}-${item.pageNumber}-${item.excerpt.slice(0, 40)}`}>
                <article className="rounded-xl border-2 border-brutal-ink bg-brutal-surface p-4 shadow-brutal-sm transition-shadow hover:shadow-brutal">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-brutal-ink bg-brutal-bg">
                      <FileText className="h-5 w-5 text-brutal-secondary" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/documents/${item.documentId}`}
                        className="focus-brutal font-heading text-base font-bold text-brutal-ink hover:underline"
                      >
                        {item.documentTitle}
                      </Link>
                      {item.pageNumber != null && (
                        <p className="text-xs text-brutal-muted">Trang {item.pageNumber}</p>
                      )}
                      <p className="mt-2 line-clamp-3 text-sm text-brutal-muted">
                        {item.excerpt}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AskAiLink
                          href={`/chat?contextType=document&contextId=${item.documentId}`}
                          className="!inline-flex text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12">
          <LoadingScreen />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
