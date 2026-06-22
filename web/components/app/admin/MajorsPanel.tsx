"use client";

import { GraduationCap, Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { AdminFormModal } from "@/components/app/admin/AdminFormModal";
import {
  AdminStatusBadge,
  AdminTableShell,
  AdminTableSkeleton,
} from "@/components/app/admin/AdminTableShell";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { getUserErrorMessage } from "@/lib/errors";
import {
  useAdminMajors,
  useArchiveMajor,
  useCreateMajor,
  useUpdateMajor,
  type Major,
} from "@/lib/queries/admin-academic";
import { cn } from "@/lib/cn";

interface MajorFormState {
  code: string;
  name: string;
  description: string;
}

const EMPTY_FORM: MajorFormState = { code: "", name: "", description: "" };

export function MajorsPanel() {
  const { data: majors, isLoading, isError } = useAdminMajors();
  const { mutate: createMajor, isPending: isCreating } = useCreateMajor();
  const { mutate: updateMajor, isPending: isUpdating } = useUpdateMajor();
  const { mutate: archiveMajor, isPending: isArchiving } = useArchiveMajor();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Major | null>(null);
  const [form, setForm] = useState<MajorFormState>(EMPTY_FORM);
  const [archiveTarget, setArchiveTarget] = useState<Major | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(major: Major) {
    setEditing(major);
    setForm({
      code: major.code,
      name: major.name,
      description: major.description,
    });
    setError(null);
    setFormOpen(true);
  }

  function handleSubmit() {
    if (!form.code.trim() || !form.name.trim()) return;
    setError(null);
    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
    };

    if (editing) {
      updateMajor(
        { id: editing.id, body },
        {
          onSuccess: () => setFormOpen(false),
          onError: (err) => setError(getUserErrorMessage(err)),
        },
      );
    } else {
      createMajor(body, {
        onSuccess: () => setFormOpen(false),
        onError: (err) => setError(getUserErrorMessage(err)),
      });
    }
  }

  function handleReactivate(major: Major) {
    setError(null);
    updateMajor(
      { id: major.id, body: { isActive: true } },
      { onError: (err) => setError(getUserErrorMessage(err)) },
    );
  }

  function confirmArchive() {
    if (!archiveTarget) return;
    setError(null);
    archiveMajor(archiveTarget.id, {
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
          Thêm ngành
        </BrutalButton>
      </div>

      <AdminTableShell ariaLabel="Bảng ngành học">
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
                Không tải được danh sách ngành.
              </td>
            </tr>
          )}
          {!isLoading &&
            !isError &&
            majors?.map((major) => (
              <tr
                key={major.id}
                className={cn(
                  "border-b border-brutal-ink/10 hover:bg-brutal-bg",
                  !major.isActive && "opacity-60",
                )}
              >
                <td className="px-4 py-3 font-mono text-sm font-bold">{major.code}</td>
                <td className="px-4 py-3 font-semibold">{major.name}</td>
                <td className="max-w-xs truncate px-4 py-3 text-brutal-muted">
                  {major.description || "—"}
                </td>
                <td className="px-4 py-3">
                  <AdminStatusBadge active={major.isActive} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <BrutalButton
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      onClick={() => openEdit(major)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </BrutalButton>
                    {major.isActive ? (
                      <BrutalButton
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        onClick={() => setArchiveTarget(major)}
                      >
                        Lưu trữ
                      </BrutalButton>
                    ) : (
                      <BrutalButton
                        variant="secondary"
                        className="px-3 py-1 text-xs"
                        onClick={() => handleReactivate(major)}
                        disabled={isUpdating}
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

      {!isLoading && !isError && majors?.length === 0 && (
        <EmptyState
          icon={<GraduationCap className="h-10 w-10" />}
          title="Chưa có ngành học"
          description="Thêm ngành đầu tiên để bắt đầu xây dựng chương trình đào tạo."
          action={
            <BrutalButton variant="primary" onClick={openCreate}>
              Thêm ngành
            </BrutalButton>
          }
        />
      )}

      <AdminFormModal
        open={formOpen}
        title={editing ? "Sửa ngành học" : "Thêm ngành học"}
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
            >
              {editing ? "Lưu" : "Tạo"}
            </BrutalButton>
          </>
        }
      >
        <label className="block text-sm font-bold">
          Mã ngành
          <input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink px-3 py-2 text-sm uppercase"
            placeholder="SE"
            maxLength={30}
          />
        </label>
        <label className="block text-sm font-bold">
          Tên ngành
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink px-3 py-2 text-sm"
            placeholder="Kỹ thuật phần mềm"
            maxLength={150}
          />
        </label>
        <label className="block text-sm font-bold">
          Mô tả (tuỳ chọn)
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            maxLength={1000}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink px-3 py-2 text-sm"
          />
        </label>
      </AdminFormModal>

      <ConfirmDialog
        open={!!archiveTarget}
        title="Lưu trữ ngành học?"
        description={
          archiveTarget
            ? `Ngành "${archiveTarget.name}" sẽ không hiển thị trong danh mục công khai. Không thể lưu trữ nếu sinh viên đang chọn ngành này.`
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
