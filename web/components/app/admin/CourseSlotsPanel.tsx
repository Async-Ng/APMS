"use client";

import { Layers, Plus, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { AdminClientPagination } from "@/components/app/admin/AdminClientPagination";
import { AdminFormModal } from "@/components/app/admin/AdminFormModal";
import { AdminSearchBar } from "@/components/app/admin/AdminSearchBar";
import {
  AdminStatusBadge,
  AdminTableShell,
  AdminTableSkeleton,
} from "@/components/app/admin/AdminTableShell";
import { SubjectSearchSelect } from "@/components/app/admin/SubjectSearchSelect";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { getUserErrorMessage } from "@/lib/errors";
import { filterBySearch, filterBySearchFn, paginateItems } from "@/lib/admin/client-table";
import {
  useAdminCourseSlots,
  useAdminCurriculumSemesters,
  useAdminCurricula,
  useAdminSubjects,
  useArchiveCourseSlot,
  useBulkCreateCourseSlots,
  useCreateCourseSlot,
  useUpdateCourseSlot,
  type BulkCreateCourseSlotsResult,
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
  curriculumId: lockedCurriculumId,
  showCurriculumHeader = true,
}: {
  curriculumId?: string | null;
  showCurriculumHeader?: boolean;
} = {}) {
  const [localCurriculumFilter, setLocalCurriculumFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const curriculumFilter = lockedCurriculumId ?? localCurriculumFilter;

  const { data: curricula } = useAdminCurricula();
  const { data: subjects } = useAdminSubjects();
  const { data: curriculumSemesterLinks } = useAdminCurriculumSemesters(
    curriculumFilter || undefined,
  );

  const { data: courses, isLoading, isError } = useAdminCourseSlots({
    curriculumId: curriculumFilter || undefined,
    semesterId: semesterFilter || undefined,
    includeInactive,
  });

  const { mutate: createCourse, isPending: isCreating } = useCreateCourseSlot();
  const { mutate: updateCourse, isPending: isUpdating } = useUpdateCourseSlot();
  const { mutate: archiveCourse, isPending: isArchiving } = useArchiveCourseSlot();
  const { mutate: bulkCreateCourses, isPending: isBulkCreating } = useBulkCreateCourseSlots();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EnrichedCourseSlot | null>(null);
  const [form, setForm] = useState<CourseSlotFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<EnrichedCourseSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCurriculumId, setBulkCurriculumId] = useState("");
  const [bulkSemesterId, setBulkSemesterId] = useState("");
  const [bulkSubjectIds, setBulkSubjectIds] = useState<string[]>([]);
  const [bulkSubjectSearch, setBulkSubjectSearch] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkCreateCourseSlotsResult | null>(null);

  const lockedCurriculum = curricula?.find((m) => m.id === lockedCurriculumId);

  const { data: formCurriculumSemesters } = useAdminCurriculumSemesters(
    form.curriculumId || undefined,
  );
  const { data: bulkCurriculumSemesters } = useAdminCurriculumSemesters(
    bulkCurriculumId || undefined,
  );

  const filterSemesters = useMemo(
    () =>
      curriculumSemesterLinks
        ?.filter((link) => link.isActive && link.semester)
        .map((link) => link.semester!)
        .sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
    [curriculumSemesterLinks],
  );

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const filteredCourses = useMemo(() => {
    const list = courses ?? [];
    return filterBySearchFn(list, search, (course) => [
      course.subject?.code,
      course.subject?.name,
    ]);
  }, [courses, search]);

  const { items: pagedCourses, pagination } = useMemo(
    () => paginateItems(filteredCourses, page),
    [filteredCourses, page],
  );

  const hideCurriculumColumn = Boolean(lockedCurriculumId);
  const colCount = hideCurriculumColumn ? 4 : 5;

  const activeCurricula = curricula?.filter((m) => m.isActive) ?? [];
  const activeSubjects = useMemo(
    () => subjects?.filter((s) => s.isActive) ?? [],
    [subjects],
  );
  const semesterOptions = useMemo(
    () =>
      formCurriculumSemesters?.filter((l) => l.isActive && l.semester).map((l) => l.semester!) ?? [],
    [formCurriculumSemesters],
  );
  const bulkSemesterOptions = useMemo(
    () =>
      bulkCurriculumSemesters?.filter((l) => l.isActive && l.semester).map((l) => l.semester!) ?? [],
    [bulkCurriculumSemesters],
  );

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
    const defaultCurriculum = lockedCurriculumId ?? activeCurricula[0]?.id ?? "";
    setEditing(null);
    setForm({
      curriculumId: defaultCurriculum,
      subjectId: "",
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

  function openBulkCreate() {
    setBulkCurriculumId(lockedCurriculumId ?? activeCurricula[0]?.id ?? "");
    setBulkSemesterId("");
    setBulkSubjectIds([]);
    setBulkSubjectSearch("");
    setBulkError(null);
    setBulkResult(null);
    setBulkOpen(true);
  }

  const filteredBulkSubjects = useMemo(
    () => filterBySearch(activeSubjects, bulkSubjectSearch, ["code", "name"]),
    [activeSubjects, bulkSubjectSearch],
  );

  function toggleBulkSubject(subjectId: string) {
    setBulkSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId],
    );
  }

  function handleBulkSubmit() {
    if (!bulkCurriculumId || !bulkSemesterId || bulkSubjectIds.length === 0) return;
    setBulkError(null);
    bulkCreateCourses(
      { curriculumId: bulkCurriculumId, semesterId: bulkSemesterId, subjectIds: bulkSubjectIds },
      {
        onSuccess: (result) => {
          setBulkResult(result);
          setBulkSubjectIds([]);
        },
        onError: (err) => setBulkError(getUserErrorMessage(err)),
      },
    );
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

  return (
    <div className="space-y-4">
      {error && (
        <ErrorAlert message={error} actionLabel="Đóng" onAction={() => setError(null)} />
      )}

      <div className="flex flex-col gap-3">
        <AdminSearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Tìm theo mã hoặc tên môn…"
          id="course-slots-search"
          className="w-full sm:max-w-xs"
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-3">
            {!lockedCurriculumId && (
            <div>
              <label htmlFor="curriculum-filter" className="sr-only">
                Lọc theo ngành
              </label>
              <select
                id="curriculum-filter"
                value={curriculumFilter}
                onChange={(e) => {
                  setLocalCurriculumFilter(e.target.value);
                  setSemesterFilter("");
                  setPage(1);
                }}
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
            )}
            {showCurriculumHeader && lockedCurriculum && (
              <p className="self-center text-sm font-bold text-brutal-ink">
                CTĐT: {lockedCurriculum.code} — {lockedCurriculum.name}
              </p>
            )}
            <div>
              <label htmlFor="curriculum-filter-semester" className="sr-only">
                Lọc theo học kỳ
              </label>
              <select
                id="curriculum-filter-semester"
                value={semesterFilter}
                onChange={(e) => {
                  setSemesterFilter(e.target.value);
                  setPage(1);
                }}
                className="focus-brutal rounded-lg border-2 border-brutal-ink bg-brutal-surface px-2 py-1.5 text-sm font-bold"
                aria-label="Lọc theo học kỳ"
                disabled={!curriculumFilter}
              >
                <option value="">
                  {curriculumFilter ? "Tất cả học kỳ" : "Chọn CTĐT trước"}
                </option>
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
                onChange={(e) => {
                  setIncludeInactive(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-2 border-brutal-ink"
              />
              Hiện đã xóa
            </label>
          </div>
          <div className="flex shrink-0 gap-2">
            <BrutalButton
              variant="secondary"
              onClick={openBulkCreate}
              disabled={activeCurricula.length === 0 || activeSubjects.length === 0}
              className="w-auto"
            >
              <Layers className="mr-2 h-4 w-4" />
              Tạo hàng loạt
            </BrutalButton>
            <BrutalButton
              variant="primary"
              onClick={openCreate}
              disabled={activeCurricula.length === 0 || activeSubjects.length === 0}
              className="w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Gán môn
            </BrutalButton>
          </div>
        </div>
      </div>

      <AdminTableShell ariaLabel="Bảng môn trong CTĐT">
        <thead>
          <tr className="border-b-2 border-brutal-ink bg-brutal-bg">
            {!hideCurriculumColumn && (
              <th scope="col" className="px-4 py-3 text-left font-heading font-bold">CTĐT</th>
            )}
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Học kỳ</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Môn học</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Trạng thái</th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <AdminTableSkeleton cols={colCount} />}
          {isError && (
            <tr>
              <td colSpan={colCount} className="px-4 py-6 text-center text-sm text-brutal-danger">
                Không tải được chương trình đào tạo.
              </td>
            </tr>
          )}
          {!isLoading && !isError && filteredCourses.length === 0 && (
            <tr>
              <td colSpan={colCount} className="px-4 py-10 text-center">
                <Layers className="mx-auto mb-2 h-8 w-8 text-brutal-muted" aria-hidden />
                <p className="text-sm font-semibold text-brutal-ink">
                  {search ? "Không tìm thấy môn" : "Chưa có môn trong CTĐT"}
                </p>
                {!search && (
                  <p className="mt-1 text-xs text-brutal-muted">
                    Gán môn học vào ngành và học kỳ cụ thể.
                  </p>
                )}
              </td>
            </tr>
          )}
          {!isLoading &&
            !isError &&
            pagedCourses.map((course) => (
              <tr
                key={course.id}
                className={cn(
                  "border-b border-brutal-ink/10 hover:bg-brutal-bg",
                  !course.isActive && "opacity-60",
                )}
              >
                {!hideCurriculumColumn && (
                <td className="px-4 py-3">
                  <p className="font-mono text-xs font-bold">{course.curriculum?.code ?? "—"}</p>
                  <p className="text-sm">{course.curriculum?.name ?? course.curriculumId}</p>
                </td>
                )}
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

      <AdminClientPagination
        pagination={pagination}
        onPageChange={setPage}
        itemLabel="môn"
      />

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
          {lockedCurriculumId ? (
            <p className="mt-1 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm font-medium">
              {lockedCurriculum?.code} — {lockedCurriculum?.name}
            </p>
          ) : (
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
          )}
          <FieldError message={fieldErrors.curriculumId} />
          {formOpen && form.curriculumId && !lockedCurriculumId && (
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
          {semesterOptions.length === 0 && form.curriculumId && (
            <p className="mt-2 text-xs text-brutal-muted">
              Chưa gán học kỳ cho CTĐT này. Sửa CTĐT ở tab Chương trình đào tạo để chọn học kỳ.
            </p>
          )}
          <FieldError message={fieldErrors.semesterId} />
        </label>
        <div className="block text-sm font-bold">
          <span id="course-slot-subject-label">Môn học</span>
          <div className="mt-1">
            <SubjectSearchSelect
              id="course-slot-subject-search"
              subjects={activeSubjects}
              value={form.subjectId}
              onChange={(subjectId) => {
                setForm((f) => ({ ...f, subjectId }));
                setFieldErrors((fe) => ({ ...fe, subjectId: "" }));
              }}
            />
          </div>
          <FieldError message={fieldErrors.subjectId} />
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={bulkOpen}
        title="Tạo hàng loạt Course slot"
        onClose={() => setBulkOpen(false)}
        footer={
          <>
            <BrutalButton variant="ghost" className="flex-1" onClick={() => setBulkOpen(false)}>
              Đóng
            </BrutalButton>
            <BrutalButton
              variant="primary"
              className="flex-1"
              onClick={handleBulkSubmit}
              loading={isBulkCreating}
              disabled={!bulkCurriculumId || !bulkSemesterId || bulkSubjectIds.length === 0}
            >
              Tạo {bulkSubjectIds.length > 0 ? `(${bulkSubjectIds.length})` : ""}
            </BrutalButton>
          </>
        }
      >
        {bulkError && <ErrorAlert message={bulkError} actionLabel="Đóng" onAction={() => setBulkError(null)} />}
        {bulkResult && (
          <div className="rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm">
            <p className="font-bold">
              Đã tạo {bulkResult.created.length} môn, bỏ qua {bulkResult.skipped.length} môn.
            </p>
            {bulkResult.skipped.length > 0 && (
              <p className="mt-1 text-xs text-brutal-muted">
                Bỏ qua do trùng lặp hoặc không hoạt động.
              </p>
            )}
          </div>
        )}
        <label className="block text-sm font-bold">
          Chương trình đào tạo
          {lockedCurriculumId ? (
            <p className="mt-1 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm font-medium">
              {lockedCurriculum?.code} — {lockedCurriculum?.name}
            </p>
          ) : (
            <select
              value={bulkCurriculumId}
              onChange={(e) => {
                setBulkCurriculumId(e.target.value);
                setBulkSemesterId("");
                setBulkResult(null);
              }}
              className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm"
            >
              {activeCurricula.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="block text-sm font-bold">
          Học kỳ
          <select
            value={bulkSemesterId}
            onChange={(e) => {
              setBulkSemesterId(e.target.value);
              setBulkResult(null);
            }}
            className="focus-brutal mt-1 w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm"
            disabled={bulkSemesterOptions.length === 0}
          >
            <option value="">
              {bulkSemesterOptions.length === 0 ? "Chưa gán học kỳ cho ngành" : "Chọn học kỳ…"}
            </option>
            {bulkSemesterOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="text-sm font-bold">
            Môn học (tối đa 50)
            {bulkSubjectIds.length > 0 && (
              <span className="ml-1 font-medium text-brutal-muted">
                — đã chọn {bulkSubjectIds.length}
              </span>
            )}
          </p>
          <div className="relative mt-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brutal-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={bulkSubjectSearch}
              onChange={(e) => setBulkSubjectSearch(e.target.value)}
              placeholder="Tìm mã hoặc tên môn…"
              className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface py-2.5 pl-9 pr-3 text-sm outline-none"
              aria-label="Tìm môn học trong danh sách hàng loạt"
              autoComplete="off"
            />
          </div>
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border-2 border-brutal-ink bg-brutal-surface p-2">
            {filteredBulkSubjects.length === 0 ? (
              <p className="px-2 py-3 text-sm text-brutal-muted">Không tìm thấy môn.</p>
            ) : (
              filteredBulkSubjects.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-brutal-bg"
                >
                  <input
                    type="checkbox"
                    checked={bulkSubjectIds.includes(s.id)}
                    onChange={() => toggleBulkSubject(s.id)}
                    disabled={!bulkSubjectIds.includes(s.id) && bulkSubjectIds.length >= 50}
                    className="h-4 w-4 rounded border-2 border-brutal-ink"
                  />
                  <span className="font-mono text-xs font-bold">{s.code}</span>
                  <span className="min-w-0 truncate">{s.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
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
