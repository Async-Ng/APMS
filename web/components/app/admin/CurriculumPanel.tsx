"use client";

import { Layers, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  useAdminCurriculum,
  useAdminMajorSemesters,
  useAdminMajors,
  useAdminSemesters,
  useAdminSubjects,
  useArchiveCurriculum,
  useCreateCurriculum,
  useUpdateCurriculum,
  type EnrichedCurriculumCourse,
} from "@/lib/queries/admin-academic";
import { curriculumFormSchema, formatZodFieldErrors } from "@/lib/validation/admin";
import { cn } from "@/lib/cn";

interface CurriculumFormState {
  majorId: string;
  subjectId: string;
  semesterId: string;
}

const EMPTY_FORM: CurriculumFormState = {
  majorId: "",
  subjectId: "",
  semesterId: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-brutal-danger">{message}</p>;
}

export function CurriculumPanel() {
  const [majorFilter, setMajorFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data: majors } = useAdminMajors();
  const { data: subjects } = useAdminSubjects();
  const { data: allSemesters } = useAdminSemesters();

  const { data: courses, isLoading, isError } = useAdminCurriculum({
    majorId: majorFilter || undefined,
    semesterId: semesterFilter || undefined,
    includeInactive,
  });

  const { mutate: createCourse, isPending: isCreating } = useCreateCurriculum();
  const { mutate: updateCourse, isPending: isUpdating } = useUpdateCurriculum();
  const { mutate: archiveCourse, isPending: isArchiving } = useArchiveCurriculum();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EnrichedCurriculumCourse | null>(null);
  const [form, setForm] = useState<CurriculumFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<EnrichedCurriculumCourse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);

  const { data: formMajorSemesters } = useAdminMajorSemesters(form.majorId || undefined);

  const activeMajors = majors?.filter((m) => m.isActive) ?? [];
  const activeSubjects = subjects?.filter((s) => s.isActive) ?? [];
  const semesterOptions =
    formMajorSemesters?.filter((l) => l.isActive && l.semester).map((l) => l.semester!) ?? [];

  const isFormValid = useMemo(
    () =>
      curriculumFormSchema.safeParse({
        majorId: form.majorId,
        subjectId: form.subjectId,
        semesterId: form.semesterId,
      }).success &&
      activeMajors.length > 0 &&
      activeSubjects.length > 0 &&
      semesterOptions.length > 0,
    [form, activeMajors.length, activeSubjects.length, semesterOptions.length],
  );

  useEffect(() => {
    if (!form.majorId || semesterOptions.length === 0) return;
    if (!semesterOptions.some((s) => s.id === form.semesterId)) {
      setForm((f) => ({ ...f, semesterId: semesterOptions[0]?.id ?? "" }));
    }
  }, [form.majorId, form.semesterId, semesterOptions]);

  function openCreate() {
    const defaultMajor = activeMajors[0]?.id ?? "";
    setEditing(null);
    setForm({
      majorId: defaultMajor,
      subjectId: activeSubjects[0]?.id ?? "",
      semesterId: "",
    });
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  }

  function openEdit(course: EnrichedCurriculumCourse) {
    setEditing(course);
    setForm({
      majorId: course.majorId,
      subjectId: course.subjectId,
      semesterId: course.semesterId,
    });
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  }

  function handleSubmit() {
    const parsed = curriculumFormSchema.safeParse({
      majorId: form.majorId,
      subjectId: form.subjectId,
      semesterId: form.semesterId,
    });
    if (!parsed.success) {
      setFieldErrors(formatZodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setError(null);

    if (editing) {
      updateCourse(
        {
          id: editing.id,
          body: {
            majorId: parsed.data.majorId,
            subjectId: parsed.data.subjectId,
            semesterId: parsed.data.semesterId,
          },
        },
        {
          onSuccess: () => setFormOpen(false),
          onError: (err) => setError(getUserErrorMessage(err)),
        },
      );
    } else {
      createCourse(
        {
          majorId: parsed.data.majorId,
          subjectId: parsed.data.subjectId,
          semesterId: parsed.data.semesterId,
        },
        {
          onSuccess: () => setFormOpen(false),
          onError: (err) => setError(getUserErrorMessage(err)),
        },
      );
    }
  }

  function handleReactivate(course: EnrichedCurriculumCourse) {
    setError(null);
    setPendingCourseId(course.id);
    updateCourse(
      { id: course.id, body: { isActive: true } },
      {
        onSettled: () => setPendingCourseId(null),
        onError: (err) => setError(getUserErrorMessage(err)),
      },
    );
  }

  function confirmArchive() {
    if (!archiveTarget) return;
    setError(null);
    archiveCourse(archiveTarget.id, {
      onSuccess: () => setArchiveTarget(null),
      onError: (err) => {
        setError(getUserErrorMessage(err));
        setArchiveTarget(null);
      },
    });
  }

  const filterSemesters = allSemesters?.filter((s) => s.isActive) ?? [];

  return (
    <div className="space-y-4">
      {error && (
        <ErrorAlert message={error} actionLabel="Đóng" onAction={() => setError(null)} />
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="curriculum-filter-major" className="sr-only">
              Lọc theo ngành
            </label>
            <select
              id="curriculum-filter-major"
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value)}
              className="focus-brutal rounded-lg border-2 border-brutal-ink bg-brutal-surface px-2 py-1.5 text-sm font-bold"
              aria-label="Lọc theo ngành"
            >
              <option value="">Tất cả ngành</option>
              {majors?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="curriculum-filter-semester" className="sr-only">
              Lọc theo học kỳ
            </label>
            <select
              id="curriculum-filter-semester"
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="focus-brutal rounded-lg border-2 border-brutal-ink bg-brutal-surface px-2 py-1.5 text-sm font-bold"
              aria-label="Lọc theo học kỳ"
            >
              <option value="">Tất cả học kỳ</option>
              {filterSemesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              id="curriculum-filter-inactive"
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-brutal-ink"
            />
            Hiện đã xóa
          </label>
        </div>
        <BrutalButton
          variant="primary"
          onClick={openCreate}
          disabled={activeMajors.length === 0 || activeSubjects.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm mapping
        </BrutalButton>
      </div>

      <AdminTableShell ariaLabel="Bảng chương trình đào tạo">
        <thead>
          <tr className="border-b-2 border-brutal-ink bg-brutal-bg">
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Ngành</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Học kỳ</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Môn học</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Trạng thái</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <AdminTableSkeleton cols={5} />}
          {isError && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-brutal-danger">
                Không tải được chương trình đào tạo.
              </td>
            </tr>
          )}
          {!isLoading && !isError && courses?.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center">
                <Layers className="mx-auto mb-2 h-8 w-8 text-brutal-muted" aria-hidden />
                <p className="text-sm font-semibold text-brutal-ink">Chưa có mapping CTĐT</p>
              </td>
            </tr>
          )}
          {!isLoading &&
            !isError &&
            courses?.map((course) => (
              <tr
                key={course.id}
                className={cn(
                  "border-b border-brutal-ink/10 hover:bg-brutal-bg",
                  !course.isActive && "opacity-60",
                )}
              >
                <td className="px-4 py-3">
                  <p className="font-mono text-xs font-bold">{course.major?.code ?? "—"}</p>
                  <p className="text-sm">{course.major?.name ?? course.majorId}</p>
                </td>
                <td className="px-4 py-3 font-bold">
                  {course.semester?.code ?? "—"}
                  <p className="text-xs font-normal text-brutal-muted">
                    {course.semester?.name}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs font-bold">{course.subject?.code ?? "—"}</p>
                  <p className="text-sm">{course.subject?.name ?? course.subjectId}</p>
                </td>
                <td className="px-4 py-3">
                  <AdminStatusBadge active={course.isActive} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <BrutalButton
                      variant="ghost"
                      className="px-3 py-1 text-xs"
                      onClick={() => openEdit(course)}
                    >
                      Sửa
                    </BrutalButton>
                    {course.isActive ? (
                      <BrutalButton
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        onClick={() => setArchiveTarget(course)}
                      >
                        Xóa
                      </BrutalButton>
                    ) : (
                      <BrutalButton
                        variant="secondary"
                        className="px-3 py-1 text-xs"
                        onClick={() => handleReactivate(course)}
                        disabled={pendingCourseId === course.id}
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
        title={editing ? "Sửa mapping CTĐT" : "Thêm mapping CTĐT"}
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
          Ngành học
          <select
            value={form.majorId}
            onChange={(e) => {
              setForm((f) => ({ ...f, majorId: e.target.value, semesterId: "" }));
              setFieldErrors((fe) => ({ ...fe, majorId: "" }));
            }}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm"
          >
            {activeMajors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.majorId} />
        </label>
        <label className="block text-sm font-bold">
          Học kỳ
          <select
            value={form.semesterId}
            onChange={(e) => {
              setForm((f) => ({ ...f, semesterId: e.target.value }));
              setFieldErrors((fe) => ({ ...fe, semesterId: "" }));
            }}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm"
            disabled={semesterOptions.length === 0}
          >
            {semesterOptions.length === 0 ? (
              <option value="">Chưa gán học kỳ cho ngành</option>
            ) : (
              semesterOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))
            )}
          </select>
          <FieldError message={fieldErrors.semesterId} />
        </label>
        <label className="block text-sm font-bold">
          Môn học
          <select
            value={form.subjectId}
            onChange={(e) => {
              setForm((f) => ({ ...f, subjectId: e.target.value }));
              setFieldErrors((fe) => ({ ...fe, subjectId: "" }));
            }}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm"
          >
            {activeSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.subjectId} />
        </label>
      </AdminFormModal>

      <ConfirmDialog
        open={!!archiveTarget}
        title="Xóa mapping CTĐT?"
        description="Mapping này sẽ không hiển thị trong danh mục công khai."
        confirmLabel="Xóa"
        tone="danger"
        isPending={isArchiving}
        onConfirm={confirmArchive}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}
