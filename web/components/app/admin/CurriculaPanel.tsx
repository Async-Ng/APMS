"use client";

import { useQueries } from "@tanstack/react-query";
import { GraduationCap, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AdminClientPagination } from "@/components/app/admin/AdminClientPagination";
import { AdminFormModal } from "@/components/app/admin/AdminFormModal";
import { AdminSearchBar } from "@/components/app/admin/AdminSearchBar";
import {
  AdminStatusBadge,
  AdminTableShell,
  AdminTableSkeleton,
} from "@/components/app/admin/AdminTableShell";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { api } from "@/lib/api-client";
import { filterBySearch, paginateItems } from "@/lib/admin/client-table";
import { cn } from "@/lib/cn";
import { getUserErrorMessage } from "@/lib/errors";
import {
  syncCurriculumSemesterLinks,
  useAdminCurricula,
  useAdminCurriculumSemesters,
  useAdminSemesters,
  useArchiveCurriculum,
  useArchiveCurriculumSemester,
  useAssignCurriculumSemesters,
  useCreateCurriculum,
  useUpdateCurriculum,
  type Curriculum,
  type CurriculumSemesterLink,
  type Semester,
} from "@/lib/queries/admin-academic";
import {
  curriculumEntityFormSchema,
  formatZodFieldErrors,
} from "@/lib/validation/admin";

interface CurriculumFormState {
  code: string;
  name: string;
  description: string;
}

const EMPTY_FORM: CurriculumFormState = { code: "", name: "", description: "" };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-brutal-danger">{message}</p>;
}

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

function SemesterCheckboxList({
  semesters,
  selectedIds,
  onChange,
  disabled,
}: {
  semesters: Semester[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  if (semesters.length === 0) {
    return (
      <p className="text-sm text-brutal-muted">
        Chưa có học kỳ nào. Tạo học kỳ ở tab &quot;Học kỳ&quot; trước khi gán vào CTĐT.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {semesters.map((semester) => (
        <label
          key={semester.id}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-lg border-2 border-brutal-ink px-3 py-1.5 text-sm font-medium",
            selectedIds.includes(semester.id) && "bg-brutal-secondary text-white",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={selectedIds.includes(semester.id)}
            disabled={disabled}
            onChange={() => toggle(semester.id)}
          />
          {semester.code} — {semester.name}
        </label>
      ))}
    </div>
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
  const { data: curricula, isLoading, isError } = useAdminCurricula();
  const { data: allSemesters } = useAdminSemesters();
  const { mutateAsync: createCurriculum } = useCreateCurriculum();
  const { mutateAsync: updateCurriculumAsync, mutate: updateCurriculum } = useUpdateCurriculum();
  const { mutateAsync: assignSemesters } = useAssignCurriculumSemesters();
  const { mutateAsync: revokeSemester } = useArchiveCurriculumSemester();
  const { mutate: archiveCurriculum, isPending: isArchiving } = useArchiveCurriculum();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Curriculum | null>(null);
  const [form, setForm] = useState<CurriculumFormState>(EMPTY_FORM);
  const [selectedSemesterIds, setSelectedSemesterIds] = useState<string[]>([]);
  const [originalLinkedIds, setOriginalLinkedIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<Curriculum | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCurriculumId, setPendingCurriculumId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const editSessionRef = useRef<string | null>(null);

  const { data: editLinks, isLoading: isEditLinksLoading } = useAdminCurriculumSemesters(
    formOpen && editing ? editing.id : undefined,
  );

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

  const isFormValid = useMemo(
    () =>
      curriculumEntityFormSchema.safeParse({
        code: form.code,
        name: form.name,
        description: form.description.trim() || undefined,
      }).success,
    [form],
  );

  useEffect(() => {
    if (!formOpen || !editing || isEditLinksLoading || !editLinks) return;
    if (editSessionRef.current === editing.id) return;
    editSessionRef.current = editing.id;
    const ids = editLinks.filter((link) => link.isActive).map((link) => link.semesterId);
    setSelectedSemesterIds(ids);
    setOriginalLinkedIds(ids);
  }, [formOpen, editing, editLinks, isEditLinksLoading]);

  function resetSemesterSelection() {
    editSessionRef.current = null;
    setSelectedSemesterIds([]);
    setOriginalLinkedIds([]);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    resetSemesterSelection();
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  }

  function openEdit(curriculum: Curriculum) {
    setEditing(curriculum);
    setForm({
      code: curriculum.code,
      name: curriculum.name,
      description: curriculum.description,
    });
    resetSemesterSelection();
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit() {
    const parsed = curriculumEntityFormSchema.safeParse({
      code: form.code,
      name: form.name,
      description: form.description.trim() || undefined,
    });
    if (!parsed.success) {
      setFieldErrors(formatZodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setError(null);

    const body = {
      code: parsed.data.code.toUpperCase(),
      name: parsed.data.name,
      description: parsed.data.description,
    };

    setIsSaving(true);
    try {
      if (editing) {
        await updateCurriculumAsync({ id: editing.id, body });
        await syncCurriculumSemesterLinks(
          editing.id,
          selectedSemesterIds,
          originalLinkedIds,
          { assign: assignSemesters, revoke: revokeSemester },
        );
        setFormOpen(false);
      } else {
        const created = await createCurriculum(body);
        if (selectedSemesterIds.length > 0) {
          await assignSemesters({
            curriculumId: created.id,
            semesterIds: selectedSemesterIds,
          });
        }
        setFormOpen(false);
      }
    } catch (err) {
      setError(getUserErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
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

      <AdminTableShell ariaLabel="Bảng chương trình đào tạo">
        <thead>
          <tr className="border-b-2 border-brutal-ink bg-brutal-bg">
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Mã</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Tên</th>
            {!isCompact && (
              <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Mô tả</th>
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
                onClick={isSelectable ? () => onSelect?.(curriculum) : undefined}
                className={cn(
                  isSelectable && "cursor-pointer",
                  "border-b border-brutal-ink/10 hover:bg-brutal-bg",
                  isSelected && "bg-brutal-secondary/10 ring-2 ring-inset ring-brutal-secondary",
                  !curriculum.isActive && "opacity-60",
                )}
              >
                <td className="px-4 py-3 font-mono text-sm font-bold">{curriculum.code}</td>
                <td className="px-4 py-3 font-semibold">{curriculum.name}</td>
                {!isCompact && (
                  <td className="max-w-xs truncate px-4 py-3 text-brutal-muted">
                    {curriculum.description || "—"}
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

      <AdminFormModal
        open={formOpen}
        title={editing ? "Sửa chương trình đào tạo" : "Thêm chương trình đào tạo"}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <BrutalButton variant="ghost" className="flex-1" onClick={() => setFormOpen(false)}>
              Huỷ
            </BrutalButton>
            <BrutalButton
              variant="primary"
              className="flex-1"
              onClick={() => void handleSubmit()}
              loading={isSaving}
              disabled={!isFormValid || (Boolean(editing) && isEditLinksLoading)}
            >
              {editing ? "Lưu" : "Tạo"}
            </BrutalButton>
          </>
        }
      >
        <label className="block text-sm font-bold">
          Mã CTĐT
          <input
            value={form.code}
            onChange={(e) => {
              setForm((f) => ({ ...f, code: e.target.value }));
              setFieldErrors((fe) => ({ ...fe, code: "" }));
            }}
            onBlur={() => {
              setForm((f) => ({ ...f, code: f.code.trim().toUpperCase() }));
            }}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink px-3 py-2 text-sm"
            placeholder="SE"
            maxLength={30}
            aria-invalid={!!fieldErrors.code}
          />
          <FieldError message={fieldErrors.code} />
        </label>
        <label className="block text-sm font-bold">
          Tên CTĐT
          <input
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setFieldErrors((fe) => ({ ...fe, name: "" }));
            }}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink px-3 py-2 text-sm"
            placeholder="Kỹ thuật phần mềm"
            maxLength={150}
            aria-invalid={!!fieldErrors.name}
          />
          <FieldError message={fieldErrors.name} />
        </label>
        <label className="block text-sm font-bold">
          Mô tả (tuỳ chọn)
          <textarea
            value={form.description}
            onChange={(e) => {
              setForm((f) => ({ ...f, description: e.target.value }));
              setFieldErrors((fe) => ({ ...fe, description: "" }));
            }}
            rows={2}
            maxLength={1000}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink px-3 py-2 text-sm"
            aria-invalid={!!fieldErrors.description}
          />
          <FieldError message={fieldErrors.description} />
        </label>

        <div className="block text-sm font-bold">
          <span>Học kỳ áp dụng (tuỳ chọn)</span>
          <p className="mt-0.5 text-xs font-medium text-brutal-muted">
            Chọn các học kỳ thuộc CTĐT này. Có thể chỉnh lại khi sửa.
          </p>
          <div className="mt-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg p-3">
            {editing && isEditLinksLoading ? (
              <p className="text-sm text-brutal-muted">Đang tải học kỳ đã gán…</p>
            ) : (
              <SemesterCheckboxList
                semesters={activeSemesters}
                selectedIds={selectedSemesterIds}
                onChange={setSelectedSemesterIds}
                disabled={Boolean(editing) && isEditLinksLoading}
              />
            )}
          </div>
        </div>
      </AdminFormModal>

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
