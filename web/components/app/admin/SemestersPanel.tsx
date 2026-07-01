"use client";

import { CalendarRange, Pencil, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

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
import { getUserErrorMessage } from "@/lib/errors";
import { filterBySearch, paginateItems } from "@/lib/admin/client-table";
import {
  useAdminSemesters,
  useArchiveSemester,
  useCreateSemester,
  useUpdateSemester,
  type Semester,
} from "@/lib/queries/admin-academic";
import { formatZodFieldErrors, semesterFormSchema } from "@/lib/validation/admin";
import { cn } from "@/lib/cn";

interface SemesterFormState {
  code: string;
  name: string;
  sortOrder: string;
}

const EMPTY_FORM: SemesterFormState = { code: "", name: "", sortOrder: "0" };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-brutal-danger">{message}</p>;
}

export function SemestersPanel() {
  const { data: semesters, isLoading, isError } = useAdminSemesters();
  const { mutate: createSemester, isPending: isCreating } = useCreateSemester();
  const { mutate: updateSemester, isPending: isUpdating } = useUpdateSemester();
  const { mutate: archiveSemester, isPending: isArchiving } = useArchiveSemester();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Semester | null>(null);
  const [form, setForm] = useState<SemesterFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<Semester | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const filteredSemesters = useMemo(
    () => filterBySearch(semesters ?? [], search, ["code", "name"]),
    [semesters, search],
  );

  const { items: pagedSemesters, pagination } = useMemo(
    () => paginateItems(filteredSemesters, page),
    [filteredSemesters, page],
  );

  const isFormValid = useMemo(
    () =>
      semesterFormSchema.safeParse({
        code: form.code,
        name: form.name,
        sortOrder: form.sortOrder,
      }).success,
    [form],
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  }

  function openEdit(semester: Semester) {
    setEditing(semester);
    setForm({
      code: semester.code,
      name: semester.name,
      sortOrder: String(semester.sortOrder),
    });
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  }

  function handleSubmit() {
    const parsed = semesterFormSchema.safeParse({
      code: form.code,
      name: form.name,
      sortOrder: form.sortOrder,
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
      sortOrder: parsed.data.sortOrder,
    };

    if (editing) {
      updateSemester(
        { id: editing.id, body },
        {
          onSuccess: () => setFormOpen(false),
          onError: (err) => setError(getUserErrorMessage(err)),
        },
      );
    } else {
      createSemester(body, {
        onSuccess: () => setFormOpen(false),
        onError: (err) => setError(getUserErrorMessage(err)),
      });
    }
  }

  function handleReactivate(semester: Semester) {
    setError(null);
    setPendingId(semester.id);
    updateSemester(
      { id: semester.id, body: { isActive: true } },
      {
        onSettled: () => setPendingId(null),
        onError: (err) => setError(getUserErrorMessage(err)),
      },
    );
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
          placeholder="Tìm theo mã hoặc tên học kỳ…"
          id="semesters-search"
          className="w-full sm:max-w-xs"
        />
        <BrutalButton variant="primary" onClick={openCreate} className="w-auto shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Thêm học kỳ
        </BrutalButton>
      </div>

      <AdminTableShell ariaLabel="Bảng học kỳ">
        <thead>
          <tr className="border-b-2 border-brutal-ink bg-brutal-bg">
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Mã</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Tên</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Thứ tự</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Trạng thái</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <AdminTableSkeleton cols={5} />}
          {isError && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-brutal-danger">
                Không tải được danh sách học kỳ.
              </td>
            </tr>
          )}
          {!isLoading && !isError && filteredSemesters.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center">
                <CalendarRange className="mx-auto mb-2 h-8 w-8 text-brutal-muted" aria-hidden />
                <p className="text-sm font-semibold text-brutal-ink">
                  {search ? "Không tìm thấy học kỳ" : "Chưa có học kỳ"}
                </p>
              </td>
            </tr>
          )}
          {!isLoading &&
            !isError &&
            pagedSemesters.map((semester) => (
              <tr
                key={semester.id}
                className={cn(
                  "border-b border-brutal-ink/10 hover:bg-brutal-bg",
                  !semester.isActive && "opacity-60",
                )}
              >
                <td className="px-4 py-3 font-mono text-sm font-bold">{semester.code}</td>
                <td className="px-4 py-3 font-semibold">{semester.name}</td>
                <td className="px-4 py-3 tabular-nums">{semester.sortOrder}</td>
                <td className="px-4 py-3">
                  <AdminStatusBadge active={semester.isActive} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <BrutalButton
                      variant="ghost"
                      className="px-3 py-1 text-xs"
                      onClick={() => openEdit(semester)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Sửa
                    </BrutalButton>
                    {semester.isActive ? (
                      <BrutalButton
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        onClick={() => setArchiveTarget(semester)}
                      >
                        Xóa
                      </BrutalButton>
                    ) : (
                      <BrutalButton
                        variant="secondary"
                        className="px-3 py-1 text-xs"
                        onClick={() => handleReactivate(semester)}
                        disabled={pendingId === semester.id}
                      >
                        Kích hoạt
                      </BrutalButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </AdminTableShell>

      <AdminClientPagination
        pagination={pagination}
        onPageChange={setPage}
        itemLabel="học kỳ"
      />

      <AdminFormModal
        open={formOpen}
        title={editing ? "Sửa học kỳ" : "Thêm học kỳ"}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <BrutalButton variant="ghost" className="flex-1" onClick={() => setFormOpen(false)}>
              Huỷ
            </BrutalButton>
            <BrutalButton
              variant="primary"
              className="flex-1"
              onClick={handleSubmit}
              loading={isCreating || isUpdating}
              disabled={!isFormValid}
            >
              {editing ? "Lưu" : "Tạo"}
            </BrutalButton>
          </>
        }
      >
        <label className="block text-sm font-bold">
          Mã (ví dụ HK1)
          <input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm"
            placeholder="HK1"
          />
          <FieldError message={fieldErrors.code} />
        </label>
        <label className="block text-sm font-bold">
          Tên hiển thị
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm"
            placeholder="Học kỳ 1"
          />
          <FieldError message={fieldErrors.name} />
        </label>
        <label className="block text-sm font-bold">
          Thứ tự
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm"
            min={0}
          />
          <FieldError message={fieldErrors.sortOrder} />
        </label>
      </AdminFormModal>

      <ConfirmDialog
        open={!!archiveTarget}
        title="Xóa học kỳ?"
        description="Học kỳ sẽ không hiển thị trong danh mục. Không thể xóa nếu đang được gán cho ngành hoặc sinh viên."
        confirmLabel="Xóa"
        tone="danger"
        isPending={isArchiving}
        onConfirm={() => {
          if (!archiveTarget) return;
          archiveSemester(archiveTarget.id, {
            onSuccess: () => setArchiveTarget(null),
            onError: (err) => {
              setError(getUserErrorMessage(err));
              setArchiveTarget(null);
            },
          });
        }}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}
