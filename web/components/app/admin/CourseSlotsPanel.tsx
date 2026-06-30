"use client";

import { Layers, Plus } from "lucide-react";
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
  useAdminCourseSlots,
  useAdminCurriculumSemesters,
  useAdminCurricula,
  useAdminSemesters,
  useAdminSubjects,
  useArchiveCourseSlot,
  useCreateCourseSlot,
  useUpdateCourseSlot,
  type EnrichedCourseSlot,
} from "@/lib/queries/admin-academic";
import { courseSlotFormSchema, formatZodFieldErrors } from "@/lib/validation/admin";
import { cn } from "@/lib/cn";

interface CourseSlotFormState {
  curriculumId: string;
  subjectId: string;
  semesterId: string;
}

const EMPTY_FORM: CourseSlotFormState = {
  curriculumId: "",
  subjectId: "",
  semesterId: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-brutal-danger">{message}</p>;
}

export function CourseSlotsPanel({
  onNavigateToCurriculumSemesters,
}: {
  onNavigateToCurriculumSemesters?: (curriculumId: string) => void;
} = {}) {
  const [curriculumFilter, setCurriculumFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data: curricula } = useAdminCurricula();
  const { data: subjects } = useAdminSubjects();
  const { data: allSemesters } = useAdminSemesters();

  const { data: courses, isLoading, isError } = useAdminCourseSlots({
    curriculumId: curriculumFilter || undefined,
    semesterId: semesterFilter || undefined,
    includeInactive,
  });

  const { mutate: createCourse, isPending: isCreating } = useCreateCourseSlot();
  const { mutate: updateCourse, isPending: isUpdating } = useUpdateCourseSlot();
  const { mutate: archiveCourse, isPending: isArchiving } = useArchiveCourseSlot();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EnrichedCourseSlot | null>(null);
  const [form, setForm] = useState<CourseSlotFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<EnrichedCourseSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);

  const { data: formCurriculumSemesters } = useAdminCurriculumSemesters(form.curriculumId || undefined);

  const activeCurricula = curricula?.filter((m) => m.isActive) ?? [];
  const activeSubjects = subjects?.filter((s) => s.isActive) ?? [];
  const semesterOptions =
    formCurriculumSemesters?.filter((l) => l.isActive && l.semester).map((l) => l.semester!) ?? [];

  const resolvedSemesterId = useMemo(() => {
    if (!form.curriculumId || semesterOptions.length === 0) return form.semesterId;
    if (semesterOptions.some((s) => s.id === form.semesterId)) return form.semesterId;
    return semesterOptions[0]?.id ?? "";
  }, [form.curriculumId, form.semesterId, semesterOptions]);

  const isFormValid = useMemo(
    () =>
      courseSlotFormSchema.safeParse({
        curriculumId: form.curriculumId,
        subjectId: form.subjectId,
        semesterId: resolvedSemesterId,
      }).success &&
      activeCurricula.length > 0 &&
      activeSubjects.length > 0 &&
      semesterOptions.length > 0,
    [form, activeCurricula.length, activeSubjects.length, semesterOptions.length, resolvedSemesterId],
  );

  function openCreate() {
    const defaultCurriculum = activeCurricula[0]?.id ?? "";
    setEditing(null);
    setForm({
      curriculumId: defaultCurriculum,
      subjectId: activeSubjects[0]?.id ?? "",
      semesterId: "",
    });
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  }

  function openEdit(course: EnrichedCourseSlot) {
    setEditing(course);
    setForm({
      curriculumId: course.curriculumId,
      subjectId: course.subjectId,
      semesterId: course.semesterId,
    });
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  }

  function handleSubmit() {
    const parsed = courseSlotFormSchema.safeParse({
      curriculumId: form.curriculumId,
      subjectId: form.subjectId,
      semesterId: resolvedSemesterId,
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
            curriculumId: parsed.data.curriculumId,
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
          curriculumId: parsed.data.curriculumId,
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

  function handleReactivate(course: EnrichedCourseSlot) {
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
            <label htmlFor="curriculum-filter" className="sr-only">
              Lọc theo ngành
            </label>
            <select
              id="curriculum-filter"
              value={curriculumFilter}
              onChange={(e) => setCurriculumFilter(e.target.value)}
              className="focus-brutal rounded-lg border-2 border-brutal-ink bg-brutal-surface px-2 py-1.5 text-sm font-bold"
              aria-label="Lọc theo ngành"
            >
              <option value="">Tất cả ngành</option>
              {curricula?.map((m) => (
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
          disabled={activeCurricula.length === 0 || activeSubjects.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Gán môn
        </BrutalButton>
      </div>

      <AdminTableShell ariaLabel="Bảng chương trình đào tạo">
        <thead>
          <tr className="border-b-2 border-brutal-ink bg-brutal-bg">
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">CTĐT</th>
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
                <p className="text-sm font-semibold text-brutal-ink">Chưa có môn trong CTĐT</p>
                <p className="mt-1 text-xs text-brutal-muted">
                  Gán môn học vào ngành và học kỳ cụ thể.
                </p>
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
                  <p className="font-mono text-xs font-bold">{course.curriculum?.code ?? "—"}</p>
                  <p className="text-sm">{course.curriculum?.name ?? course.curriculumId}</p>
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
                      aria-label={`Sửa môn CTĐT ${course.curriculum?.code ?? ""} ${course.semester?.code ?? ""}`}
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
        title={editing ? "Sửa môn trong CTĐT" : "Gán môn vào CTĐT"}
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
          Chương trình đào tạo
          <select
            value={form.curriculumId}
            onChange={(e) => {
              setForm((f) => ({ ...f, curriculumId: e.target.value, semesterId: "" }));
              setFieldErrors((fe) => ({ ...fe, curriculumId: "" }));
            }}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm"
          >
            {activeCurricula.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.curriculumId} />
          {formOpen && form.curriculumId && (
            <p className="mt-1 text-xs text-brutal-muted">
              Đổi ngành sẽ cập nhật danh sách học kỳ khả dụng bên dưới.
            </p>
          )}
        </label>
        <label className="block text-sm font-bold">
          Học kỳ
          <select
            value={resolvedSemesterId}
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
          {semesterOptions.length === 0 && form.curriculumId && onNavigateToCurriculumSemesters && (
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                onNavigateToCurriculumSemesters(form.curriculumId);
              }}
              className="focus-brutal mt-2 text-xs font-bold text-brutal-secondary underline-offset-2 hover:underline"
            >
              Gán học kỳ cho ngành này →
            </button>
          )}
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
        title="Xóa môn khỏi CTĐT?"
        description="Môn này sẽ không hiển thị trong danh mục công khai. Không thể xóa nếu sinh viên hoặc tài liệu đang tham chiếu. Có thể kích hoạt lại sau."
        confirmLabel="Xóa"
        tone="danger"
        isPending={isArchiving}
        onConfirm={confirmArchive}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}
