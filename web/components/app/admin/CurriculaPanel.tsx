"use client";

import { useQueries } from "@tanstack/react-query";
import { GraduationCap, Pencil, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminClientPagination } from "@/components/app/admin/AdminClientPagination";
import { AdminSearchBar } from "@/components/app/admin/AdminSearchBar";
import {
  AdminStatusBadge,
  AdminTableShell,
  AdminTableSkeleton,
  AdminTableTruncate,
} from "@/components/app/admin/AdminTableShell";
import { CurriculumFormModal } from "@/components/app/admin/CurriculumFormModal";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { api } from "@/lib/api-client";
import { filterBySearch, paginateItems } from "@/lib/admin/client-table";
import { cn } from "@/lib/cn";
import { getUserErrorMessage } from "@/lib/errors";
import {
  useAdminCurricula,
  useAdminSemesters,
  useArchiveCurriculum,
  useUpdateCurriculum,
  type Curriculum,
  type CurriculumSemesterLink,
} from "@/lib/queries/admin-academic";

function formatLinkedSemesterDisplay(links: CurriculumSemesterLink[] | undefined): {
  label: string;
  title: string;
} {
  const codes =
    links
      ?.filter((link) => link.isActive && link.semester)
      .map((link) => link.semester!.code)
      .sort((a, b) => a.localeCompare(b)) ?? [];
  if (codes.length === 0) return { label: "—", title: "" };
  return { label: `${codes.length} kỳ`, title: codes.join(", ") };
}

function SemesterCountCell({
  info,
  loading,
}: {
  info?: { label: string; title: string };
  loading?: boolean;
}) {
  if (loading) {
    return <div className="skeleton h-5 w-12 rounded-md" aria-hidden />;
  }
  if (!info || info.label === "—") {
    return <span className="text-sm text-brutal-muted">—</span>;
  }
  return (
    <span
      className="inline-flex rounded-md border-2 border-brutal-ink bg-brutal-bg px-2 py-0.5 text-xs font-bold text-brutal-ink"
      title={info.title}
    >
      {info.label}
    </span>
  );
}

export function CurriculaPanel({
  selectedId,
  onSelect,
  variant = "full",
}: {
  selectedId?: string | null;
  onSelect?: (curriculum: Curriculum) => void;
  variant?: "compact" | "full";
} = {}) {
  const router = useRouter();
  const { data: curricula, isLoading, isError } = useAdminCurricula();
  const { data: allSemesters } = useAdminSemesters();
  const { mutate: updateCurriculum } = useUpdateCurriculum();
  const { mutate: archiveCurriculum, isPending: isArchiving } = useArchiveCurriculum();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Curriculum | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Curriculum | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCurriculumId, setPendingCurriculumId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const activeSemesters = useMemo(
    () => allSemesters?.filter((s) => s.isActive) ?? [],
    [allSemesters],
  );

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const filteredCurricula = useMemo(
    () => filterBySearch(curricula ?? [], search, ["code", "name"]),
    [curricula, search],
  );

  const { items: pagedCurricula, pagination } = useMemo(
    () => paginateItems(filteredCurricula, page),
    [filteredCurricula, page],
  );

  const visibleIds = useMemo(() => pagedCurricula.map((c) => c.id), [pagedCurricula]);

  const semesterLinkQueries = useQueries({
    queries: visibleIds.map((id) => ({
      queryKey: ["admin", "curriculum-semesters", id],
      queryFn: async () => {
        const res = await api.get<{ status: string; data: CurriculumSemesterLink[] }>(
          `/admin/curricula/${id}/semesters`,
        );
        return res.data.data;
      },
      enabled: visibleIds.length > 0 && !isLoading,
    })),
  });

  const semesterInfoByCurriculumId = useMemo(() => {
    const map = new Map<string, { label: string; title: string; loading: boolean }>();
    visibleIds.forEach((id, index) => {
      const query = semesterLinkQueries[index];
      if (query?.isLoading) {
        map.set(id, { label: "—", title: "", loading: true });
      } else {
        map.set(id, { ...formatLinkedSemesterDisplay(query?.data), loading: false });
      }
    });
    return map;
  }, [visibleIds, semesterLinkQueries]);

  const isCompact = variant === "compact";
  const colCount = isCompact ? 5 : 6;
  const isSelectable = Boolean(onSelect);
  const allowRowNavigation = variant === "full";

  function openCreate() {
    setEditing(null);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(curriculum: Curriculum) {
    setEditing(curriculum);
    setError(null);
    setFormOpen(true);
  }

  function handleReactivate(curriculum: Curriculum) {
    setError(null);
    setPendingCurriculumId(curriculum.id);
    updateCurriculum(
      { id: curriculum.id, body: { isActive: true } },
      {
        onSettled: () => setPendingCurriculumId(null),
        onError: (err) => setError(getUserErrorMessage(err)),
      },
    );
  }

  function confirmArchive() {
    if (!archiveTarget) return;
    setError(null);
    archiveCurriculum(archiveTarget.id, {
      onSuccess: () => setArchiveTarget(null),
      onError: (err) => {
        setError(getUserErrorMessage(err));
        setArchiveTarget(null);
      },
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <ErrorAlert message={error} actionLabel="Đóng" onAction={() => setError(null)} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminSearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Tìm theo mã hoặc tên CTĐT…"
          id="curricula-search"
          className="w-full sm:max-w-xs"
        />
        <BrutalButton variant="primary" onClick={openCreate} className="w-auto shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Thêm CTĐT
        </BrutalButton>
      </div>

      <AdminTableShell ariaLabel="Bảng chương trình đào tạo" layout="auto">
        <thead>
          <tr className="border-b-2 border-brutal-ink bg-brutal-bg">
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Mã</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Tên</th>
            {!isCompact && (
              <th
                scope="col"
                className="w-[11rem] max-w-[11rem] px-4 py-3 text-left font-heading font-bold"
              >
                Mô tả
              </th>
            )}
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Học kỳ</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Trạng thái</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <AdminTableSkeleton cols={colCount} />}
          {isError && (
            <tr>
              <td colSpan={colCount} className="px-4 py-6 text-center text-sm text-brutal-danger">
                Không tải được danh sách chương trình đào tạo.
              </td>
            </tr>
          )}
          {!isLoading && !isError && filteredCurricula.length === 0 && (
            <tr>
              <td colSpan={colCount} className="px-4 py-10 text-center">
                <GraduationCap className="mx-auto mb-2 h-8 w-8 text-brutal-muted" aria-hidden />
                <p className="text-sm font-semibold text-brutal-ink">
                  {search ? "Không tìm thấy CTĐT" : "Chưa có chương trình đào tạo"}
                </p>
                {!search && (
                  <p className="mt-1 text-xs text-brutal-muted">
                    Thêm CTĐT đầu tiên để bắt đầu xây dựng course slot.
                  </p>
                )}
              </td>
            </tr>
          )}
          {!isLoading &&
            !isError &&
            pagedCurricula.map((curriculum) => {
              const isSelected = isSelectable && selectedId === curriculum.id;
              const semesterInfo = semesterInfoByCurriculumId.get(curriculum.id);
              return (
              <tr
                key={curriculum.id}
                onClick={
                  isSelectable
                    ? () => onSelect?.(curriculum)
                    : allowRowNavigation
                      ? () => router.push(`/admin/curricula/${curriculum.id}`)
                      : undefined
                }
                className={cn(
                  (isSelectable || allowRowNavigation) && "cursor-pointer",
                  "border-b border-brutal-ink/10 hover:bg-brutal-bg",
                  isSelected && "bg-brutal-secondary/10 ring-2 ring-inset ring-brutal-secondary",
                  !curriculum.isActive && "opacity-60",
                )}
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-bold">
                  {curriculum.code}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold">
                  {curriculum.name}
                </td>
                {!isCompact && (
                  <td className="w-[11rem] max-w-[11rem] overflow-hidden px-4 py-3 text-brutal-muted">
                    <AdminTableTruncate title={curriculum.description || undefined}>
                      {curriculum.description || "—"}
                    </AdminTableTruncate>
                  </td>
                )}
                <td className="px-4 py-3">
                  <SemesterCountCell
                    info={semesterInfo}
                    loading={semesterInfo?.loading}
                  />
                </td>
                <td className="px-4 py-3">
                  <AdminStatusBadge active={curriculum.isActive} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <BrutalButton
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      onClick={() => openEdit(curriculum)}
                      aria-label={`Sửa CTĐT ${curriculum.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </BrutalButton>
                    {curriculum.isActive ? (
                      <BrutalButton
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        onClick={() => setArchiveTarget(curriculum)}
                      >
                        Xóa
                      </BrutalButton>
                    ) : (
                      <BrutalButton
                        variant="secondary"
                        className="px-3 py-1 text-xs"
                        onClick={() => handleReactivate(curriculum)}
                        disabled={pendingCurriculumId === curriculum.id}
                      >
                        Kích hoạt
                      </BrutalButton>
                    )}
                  </div>
                </td>
              </tr>
            );
            })}
        </tbody>
      </AdminTableShell>

      <AdminClientPagination
        pagination={pagination}
        onPageChange={setPage}
        itemLabel="CTĐT"
      />

      <CurriculumFormModal
        key={`${editing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        editing={editing}
        activeSemesters={activeSemesters}
        onClose={() => setFormOpen(false)}
        onSuccess={(curriculum) => {
          setPendingCurriculumId(curriculum.id);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        title="Xóa chương trình đào tạo?"
        description={
          archiveTarget
            ? `CTĐT "${archiveTarget.name}" sẽ không hiển thị trong danh mục công khai. Không thể xóa nếu sinh viên đang chọn CTĐT này. Có thể kích hoạt lại sau.`
            : ""
        }
        confirmLabel="Xóa"
        tone="danger"
        isPending={isArchiving}
        onConfirm={confirmArchive}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}
