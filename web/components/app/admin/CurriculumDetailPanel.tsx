"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CourseSlotsPanel } from "@/components/app/admin/CourseSlotsPanel";
import { AdminStatusBadge } from "@/components/app/admin/AdminTableShell";
import { CurriculumFormModal } from "@/components/app/admin/CurriculumFormModal";
import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { cn } from "@/lib/cn";
import { getUserErrorMessage } from "@/lib/errors";
import {
  useAdminCurricula,
  useAdminCurriculumSemesters,
  useAdminSemesters,
  useArchiveCurriculum,
  useUpdateCurriculum,
  type Curriculum,
} from "@/lib/queries/admin-academic";

function SemesterList({
  links,
  isLoading,
}: {
  links: Array<{ semesterId: string; semester: { code: string; name: string } | null; isActive: boolean }>;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <p className="text-sm text-brutal-muted">Đang tải học kỳ…</p>;
  }
  const active = links.filter((l) => l.isActive && l.semester);
  if (active.length === 0) {
    return <p className="text-sm text-brutal-muted">—</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {active.map((l) => (
        <span
          key={l.semesterId}
          className="inline-flex items-center rounded-md border-2 border-brutal-ink bg-brutal-bg px-2 py-0.5 text-xs font-bold"
        >
          {l.semester!.code} — {l.semester!.name}
        </span>
      ))}
    </div>
  );
}

export function CurriculumDetailPanel({ curriculumId }: { curriculumId: string }) {
  const { data: curricula, isLoading: isLoadingCurricula, isError } = useAdminCurricula();
  const { data: allSemesters } = useAdminSemesters();
  const { data: links, isLoading: isLoadingLinks } = useAdminCurriculumSemesters(curriculumId);
  const { mutate: updateCurriculum } = useUpdateCurriculum();
  const { mutate: archiveCurriculum, isPending: isArchiving } = useArchiveCurriculum();

  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Curriculum | null>(null);

  const curriculum = useMemo(
    () => curricula?.find((c) => c.id === curriculumId) ?? null,
    [curricula, curriculumId],
  );

  const activeSemesters = useMemo(
    () => allSemesters?.filter((s) => s.isActive) ?? [],
    [allSemesters],
  );

  function handleReactivate() {
    if (!curriculum) return;
    setError(null);
    updateCurriculum(
      { id: curriculum.id, body: { isActive: true } },
      { onError: (err) => setError(getUserErrorMessage(err)) },
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

  if (isLoadingCurricula) {
    return (
      <>
        <Topbar breadcrumbs={[{ label: "Quản trị", href: "/admin?tab=academic" }, { label: "CTĐT" }]} />
        <div className="p-4 sm:p-6">
          <p className="text-sm text-brutal-muted">Đang tải CTĐT…</p>
        </div>
      </>
    );
  }

  if (isError || !curriculum) {
    return (
      <>
        <Topbar breadcrumbs={[{ label: "Quản trị", href: "/admin?tab=academic" }, { label: "CTĐT" }]} />
        <div className="space-y-3 p-4 sm:p-6">
          <ErrorAlert message="Không tìm thấy CTĐT hoặc không tải được dữ liệu." />
          <Link href="/admin?tab=academic" className="inline-flex">
            <BrutalButton variant="secondary" size="sm" className="w-auto">
              Quay lại
            </BrutalButton>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        breadcrumbs={[
          { label: "Quản trị", href: "/admin?tab=academic" },
          { label: "CTĐT" },
          { label: curriculum.code },
        ]}
      />
      <div className="space-y-6 p-4 sm:p-6">
        {error && (
          <ErrorAlert message={error} actionLabel="Đóng" onAction={() => setError(null)} />
        )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-brutal-muted">
            Chương trình đào tạo
          </p>
          <h2 className="mt-1 font-heading text-xl font-extrabold text-brutal-ink">
            {curriculum.code} — {curriculum.name}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
          <Link href="/admin?tab=academic" className="inline-flex">
            <BrutalButton variant="ghost" size="sm" className="w-auto">
              Quay lại
            </BrutalButton>
          </Link>
          <BrutalButton variant="secondary" size="sm" className="w-auto" onClick={() => setFormOpen(true)}>
            Sửa
          </BrutalButton>
          {curriculum.isActive ? (
            <BrutalButton
              variant="primary"
              size="sm"
              className="w-auto"
              onClick={() => setArchiveTarget(curriculum)}
            >
              Xóa
            </BrutalButton>
          ) : (
            <BrutalButton variant="primary" size="sm" className="w-auto" onClick={handleReactivate}>
              Kích hoạt
            </BrutalButton>
          )}
        </div>
      </div>

      <div className="brutal-card space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brutal-muted">Mã</p>
            <p className="mt-1 font-mono text-sm font-extrabold">{curriculum.code}</p>
          </div>
          <div className="sm:col-span-1 lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest text-brutal-muted">Tên</p>
            <p className="mt-1 text-sm font-semibold">{curriculum.name}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brutal-muted">Trạng thái</p>
            <div className="mt-1">
              <AdminStatusBadge active={curriculum.isActive} />
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-widest text-brutal-muted">Mô tả</p>
            <p
              className={cn(
                "mt-1 whitespace-pre-wrap text-sm",
                curriculum.description ? "text-brutal-ink" : "text-brutal-muted",
              )}
            >
              {curriculum.description || "—"}
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-widest text-brutal-muted">Học kỳ</p>
            <div className="mt-2">
              <SemesterList links={links ?? []} isLoading={isLoadingLinks} />
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted">
            Môn trong CTĐT
          </h3>
        </div>
        <CourseSlotsPanel curriculumId={curriculumId} showCurriculumHeader={false} />
      </section>

      <CurriculumFormModal
        key={`${curriculum.id}-${formOpen}`}
        open={formOpen}
        editing={curriculum}
        activeSemesters={activeSemesters}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setFormOpen(false);
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
    </>
  );
}

