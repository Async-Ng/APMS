"use client";

import { BookOpen, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminFormModal } from "@/components/app/admin/AdminFormModal";
import {
  AdminStatusBadge,
  AdminTableShell,
  AdminTableSkeleton,
} from "@/components/app/admin/AdminTableShell";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { getUserErrorMessage } from "@/lib/errors";
import {
  useAdminSubjects,
  useArchiveSubject,
  useCreateSubject,
  useUpdateSubject,
  type Subject,
} from "@/lib/queries/admin-academic";
import {
  formatZodFieldErrors,
  subjectFormSchema,
} from "@/lib/validation/admin";
import { cn } from "@/lib/cn";

interface SubjectFormState {
  code: string;
  name: string;
  description: string;
}

const EMPTY_FORM: SubjectFormState = { code: "", name: "", description: "" };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-brutal-danger">{message}</p>;
}

export function SubjectsPanel() {
  const { data: subjects, isLoading, isError } = useAdminSubjects();
  const { mutate: createSubject, isPending: isCreating } = useCreateSubject();
  const { mutate: updateSubject, isPending: isUpdating } = useUpdateSubject();
  const { mutate: archiveSubject, isPending: isArchiving } = useArchiveSubject();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<Subject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSubjectId, setPendingSubjectId] = useState<string | null>(null);

  const isFormValid = useMemo(
    () =>
      subjectFormSchema.safeParse({
        code: form.code,
        name: form.name,
        description: form.description.trim() || undefined,
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

  function openEdit(subject: Subject) {
    setEditing(subject);
    setForm({
      code: subject.code,
      name: subject.name,
      description: subject.description,
    });
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  }

  function handleSubmit() {
    const parsed = subjectFormSchema.safeParse({
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

    if (editing) {
      updateSubject(
        { id: editing.id, body },
        {
          onSuccess: () => setFormOpen(false),
          onError: (err) => setError(getUserErrorMessage(err)),
        },
      );
    } else {
      createSubject(body, {
        onSuccess: () => setFormOpen(false),
        onError: (err) => setError(getUserErrorMessage(err)),
      });
    }
  }

  function handleReactivate(subject: Subject) {
    setError(null);
    setPendingSubjectId(subject.id);
    updateSubject(
      { id: subject.id, body: { isActive: true } },
      {
        onSettled: () => setPendingSubjectId(null),
        onError: (err) => setError(getUserErrorMessage(err)),
      },
    );
  }

  function confirmArchive() {
    if (!archiveTarget) return;
    setError(null);
    archiveSubject(archiveTarget.id, {
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

      <div className="flex justify-end">
        <BrutalButton variant="primary" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm môn
        </BrutalButton>
      </div>

      <AdminTableShell ariaLabel="Bảng môn học">
        <thead>
          <tr className="border-b-2 border-brutal-ink bg-brutal-bg">
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Mã</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Tên</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Mô tả</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Trạng thái</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <AdminTableSkeleton cols={5} />}
          {isError && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-brutal-danger">
                Không tải được danh sách môn học.
              </td>
            </tr>
          )}
          {!isLoading && !isError && subjects?.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-brutal-muted" aria-hidden />
                <p className="text-sm font-semibold text-brutal-ink">Chưa có môn học</p>
                <p className="mt-1 text-xs text-brutal-muted">
                  Thêm môn học để gán vào chương trình đào tạo.
                </p>
              </td>
            </tr>
          )}
          {!isLoading &&
            !isError &&
            subjects?.map((subject) => (
              <tr
                key={subject.id}
                className={cn(
                  "border-b border-brutal-ink/10 hover:bg-brutal-bg",
                  !subject.isActive && "opacity-60",
                )}
              >
                <td className="px-4 py-3 font-mono text-sm font-bold">{subject.code}</td>
                <td className="px-4 py-3 font-semibold">{subject.name}</td>
                <td className="max-w-xs truncate px-4 py-3 text-brutal-muted">
                  {subject.description || "—"}
                </td>
                <td className="px-4 py-3">
                  <AdminStatusBadge active={subject.isActive} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <BrutalButton
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      onClick={() => openEdit(subject)}
                      aria-label={`Sửa môn ${subject.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </BrutalButton>
                    {subject.isActive ? (
                      <BrutalButton
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        onClick={() => setArchiveTarget(subject)}
                      >
                        Lưu trữ
                      </BrutalButton>
                    ) : (
                      <BrutalButton
                        variant="secondary"
                        className="px-3 py-1 text-xs"
                        onClick={() => handleReactivate(subject)}
                        disabled={pendingSubjectId === subject.id}
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

      <AdminFormModal
        open={formOpen}
        title={editing ? "Sửa môn học" : "Thêm môn học"}
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
          Mã môn
          <input
            value={form.code}
            onChange={(e) => {
              setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }));
              setFieldErrors((fe) => ({ ...fe, code: "" }));
            }}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink px-3 py-2 text-sm uppercase"
            placeholder="PRN211"
            maxLength={30}
            aria-invalid={!!fieldErrors.code}
          />
          <FieldError message={fieldErrors.code} />
        </label>
        <label className="block text-sm font-bold">
          Tên môn
          <input
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setFieldErrors((fe) => ({ ...fe, name: "" }));
            }}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink px-3 py-2 text-sm"
            placeholder="Lập trình C#"
            maxLength={200}
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
      </AdminFormModal>

      <ConfirmDialog
        open={!!archiveTarget}
        title="Lưu trữ môn học?"
        description={
          archiveTarget
            ? `Môn "${archiveTarget.name}" sẽ không hiển thị trong danh mục công khai. Không thể lưu trữ nếu sinh viên đang chọn môn này.`
            : ""
        }
        confirmLabel="Lưu trữ"
        tone="danger"
        isPending={isArchiving}
        onConfirm={confirmArchive}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}
