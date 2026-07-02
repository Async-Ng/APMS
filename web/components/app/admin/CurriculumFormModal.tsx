"use client";

import { useMemo, useState } from "react";

import { AdminFormModal } from "@/components/app/admin/AdminFormModal";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { getUserErrorMessage } from "@/lib/errors";
import {
  syncCurriculumSemesterLinks,
  useArchiveCurriculumSemester,
  useAssignCurriculumSemesters,
  useCreateCurriculum,
  useUpdateCurriculum,
  type Curriculum,
  type CurriculumSemesterLink,
  type Semester,
} from "@/lib/queries/admin-academic";
import { curriculumEntityFormSchema, formatZodFieldErrors } from "@/lib/validation/admin";
import { useQuery } from "@tanstack/react-query";

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

export function CurriculumFormModal({
  open,
  editing,
  activeSemesters,
  onClose,
  onSuccess,
}: {
  open: boolean;
  editing: Curriculum | null;
  activeSemesters: Semester[];
  onClose: () => void;
  onSuccess: (curriculum: Curriculum) => void;
}) {
  const { mutateAsync: createCurriculum } = useCreateCurriculum();
  const { mutateAsync: updateCurriculum } = useUpdateCurriculum();
  const { mutateAsync: assignSemesters } = useAssignCurriculumSemesters();
  const { mutateAsync: revokeSemester } = useArchiveCurriculumSemester();

  const [form, setForm] = useState<CurriculumFormState>(() => {
    if (!editing) return EMPTY_FORM;
    return {
      code: editing.code,
      name: editing.name,
      description: editing.description ?? "",
    };
  });
  const [selectedSemesterIds, setSelectedSemesterIds] = useState<string[]>([]);
  const [touchedSemesters, setTouchedSemesters] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: editLinks, isLoading: isEditLinksLoading } = useQuery({
    queryKey: ["admin", "curriculum-semesters", editing?.id ?? "", "modal"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CurriculumSemesterLink[] }>(
        `/admin/curricula/${editing?.id}/semesters`,
      );
      return res.data.data;
    },
    enabled: open && !!editing,
  });

  const originalLinkedIds = useMemo(
    () => (editing ? (editLinks ?? []).filter((l) => l.isActive).map((l) => l.semesterId) : []),
    [editing, editLinks],
  );

  const effectiveSelectedSemesterIds = useMemo(() => {
    if (!editing) return selectedSemesterIds;
    return touchedSemesters ? selectedSemesterIds : originalLinkedIds;
  }, [editing, originalLinkedIds, selectedSemesterIds, touchedSemesters]);

  const isFormValid = useMemo(
    () =>
      curriculumEntityFormSchema.safeParse({
        code: form.code,
        name: form.name,
        description: form.description.trim() || undefined,
      }).success,
    [form],
  );

  async function handleSubmit() {
    setError(null);
    setFieldErrors({});

    const parsed = curriculumEntityFormSchema.safeParse({
      code: form.code,
      name: form.name,
      description: form.description.trim() || undefined,
    });
    if (!parsed.success) {
      setFieldErrors(formatZodFieldErrors(parsed.error));
      return;
    }

    const body = {
      code: parsed.data.code.toUpperCase(),
      name: parsed.data.name,
      description: parsed.data.description,
    };

    setIsSaving(true);
    try {
      const curriculum = editing
        ? await updateCurriculum({ id: editing.id, body })
        : await createCurriculum(body);

      await syncCurriculumSemesterLinks(
        curriculum.id,
        effectiveSelectedSemesterIds,
        originalLinkedIds,
        { assign: assignSemesters, revoke: revokeSemester },
      );

      onSuccess(curriculum);
      onClose();
    } catch (err) {
      setError(getUserErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminFormModal
      open={open}
      title={editing ? "Sửa chương trình đào tạo" : "Thêm chương trình đào tạo"}
      onClose={onClose}
      footer={
        <>
          <BrutalButton variant="ghost" className="flex-1" onClick={onClose}>
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
      {error && (
        <div className="mb-3">
          <ErrorAlert message={error} variant="inline" />
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="curriculum-code" className="block text-sm font-semibold">
            Mã
          </label>
          <input
            id="curriculum-code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm font-bold"
          />
          <FieldError message={fieldErrors.code} />
        </div>

        <div>
          <label htmlFor="curriculum-name" className="block text-sm font-semibold">
            Tên
          </label>
          <input
            id="curriculum-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm font-bold"
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div>
          <label htmlFor="curriculum-description" className="block text-sm font-semibold">
            Mô tả
          </label>
          <textarea
            id="curriculum-description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={4}
            className="focus-brutal mt-1 w-full resize-none rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm font-medium"
          />
          <FieldError message={fieldErrors.description} />
        </div>

        <div>
          <p className="text-sm font-semibold">Học kỳ</p>
          <p className="mt-1 text-xs text-brutal-muted">
            Chọn các học kỳ thuộc CTĐT này để dùng khi gán môn trong CTĐT.
          </p>
          <div className="mt-2">
            <SemesterCheckboxList
              semesters={activeSemesters}
              selectedIds={effectiveSelectedSemesterIds}
              onChange={(ids) => {
                setTouchedSemesters(true);
                setSelectedSemesterIds(ids);
              }}
              disabled={isSaving}
            />
          </div>
        </div>
      </div>
    </AdminFormModal>
  );
}

