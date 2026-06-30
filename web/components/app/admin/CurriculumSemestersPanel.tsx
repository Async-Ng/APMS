"use client";

import { Link2, Plus } from "lucide-react";
import { useMemo, useState } from "react";

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
  useAdminCurriculumSemesters,
  useAdminCurricula,
  useAdminSemesters,
  useArchiveCurriculumSemester,
  useAssignCurriculumSemesters,
} from "@/lib/queries/admin-academic";
import { cn } from "@/lib/cn";

export function CurriculumSemestersPanel({ initialCurriculumId }: { initialCurriculumId?: string } = {}) {
  const [curriculumId, setCurriculumId] = useState(initialCurriculumId ?? "");
  const [selectedSemesterIds, setSelectedSemesterIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ curriculumId: string; semesterId: string } | null>(
    null,
  );

  const { data: curricula } = useAdminCurricula();
  const { data: allSemesters } = useAdminSemesters();
  const effectiveCurriculumId = curriculumId || curricula?.find((m) => m.isActive)?.id || "";
  const { data: links, isLoading, isError } = useAdminCurriculumSemesters(
    effectiveCurriculumId || undefined,
  );
  const { mutate: assign, isPending: isAssigning } = useAssignCurriculumSemesters();
  const { mutate: revoke, isPending: isRevoking } = useArchiveCurriculumSemester();

  const activeCurricula = curricula?.filter((m) => m.isActive) ?? [];
  const activeSemesters = allSemesters?.filter((s) => s.isActive) ?? [];
  const linkedIds = useMemo(
    () => new Set(links?.filter((l) => l.isActive).map((l) => l.semesterId) ?? []),
    [links],
  );
  const availableToAssign = activeSemesters.filter((s) => !linkedIds.has(s.id));

  function toggleSemester(id: string) {
    setSelectedSemesterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleAssign() {
    if (!effectiveCurriculumId || selectedSemesterIds.length === 0) return;
    setError(null);
    assign(
      { curriculumId: effectiveCurriculumId, semesterIds: selectedSemesterIds },
      {
        onSuccess: () => setSelectedSemesterIds([]),
        onError: (err) => setError(getUserErrorMessage(err)),
      },
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <ErrorAlert message={error} actionLabel="Đóng" onAction={() => setError(null)} />
      )}

      <label className="block text-sm font-bold text-brutal-muted">
        Chọn ngành
        <select
          value={effectiveCurriculumId}
          onChange={(e) => {
            setCurriculumId(e.target.value);
            setSelectedSemesterIds([]);
          }}
          className="focus-brutal mt-1 block w-full max-w-md rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm font-medium"
        >
          {activeCurricula.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} — {m.name}
            </option>
          ))}
        </select>
      </label>

      {availableToAssign.length > 0 && (
        <div className="rounded-xl border-2 border-brutal-ink bg-brutal-surface p-4">
          <p className="mb-2 text-sm font-bold">Gán học kỳ vào ngành</p>
          <div className="flex flex-wrap gap-2">
            {availableToAssign.map((semester) => (
              <label
                key={semester.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border-2 border-brutal-ink px-3 py-1.5 text-sm font-medium",
                  selectedSemesterIds.includes(semester.id) && "bg-brutal-secondary text-white",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedSemesterIds.includes(semester.id)}
                  onChange={() => toggleSemester(semester.id)}
                />
                {semester.code} — {semester.name}
              </label>
            ))}
          </div>
          <BrutalButton
            variant="primary"
            className="mt-3"
            onClick={handleAssign}
            disabled={selectedSemesterIds.length === 0}
            loading={isAssigning}
          >
            <Plus className="mr-2 h-4 w-4" />
            Gán đã chọn
          </BrutalButton>
        </div>
      )}

      <AdminTableShell ariaLabel="Học kỳ theo ngành">
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
                Không tải được học kỳ của ngành.
              </td>
            </tr>
          )}
          {!isLoading && !isError && links?.filter((l) => l.isActive).length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center">
                <Link2 className="mx-auto mb-2 h-8 w-8 text-brutal-muted" aria-hidden />
                <p className="text-sm font-semibold text-brutal-ink">Chưa gán học kỳ cho ngành này</p>
              </td>
            </tr>
          )}
          {!isLoading &&
            !isError &&
            links
              ?.filter((link) => link.isActive && link.semester)
              .map((link) => (
                <tr key={link.id} className="border-b border-brutal-ink/10 hover:bg-brutal-bg">
                  <td className="px-4 py-3 font-mono text-sm font-bold">
                    {link.semester?.code}
                  </td>
                  <td className="px-4 py-3 font-semibold">{link.semester?.name}</td>
                  <td className="px-4 py-3 tabular-nums">{link.effectiveSortOrder}</td>
                  <td className="px-4 py-3">
                    <AdminStatusBadge active={link.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <BrutalButton
                      variant="ghost"
                      className="px-3 py-1 text-xs"
                      onClick={() =>
                        setRevokeTarget({
                          curriculumId: effectiveCurriculumId,
                          semesterId: link.semesterId,
                        })
                      }
                    >
                      Gỡ
                    </BrutalButton>
                  </td>
                </tr>
              ))}
        </tbody>
      </AdminTableShell>

      <ConfirmDialog
        open={!!revokeTarget}
        title="Gỡ học kỳ khỏi ngành?"
        description="Học kỳ sẽ không còn trong ngành này. Không thể gỡ nếu còn môn trong CTĐT hoặc sinh viên đang chọn."
        confirmLabel="Gỡ"
        tone="danger"
        isPending={isRevoking}
        onConfirm={() => {
          if (!revokeTarget) return;
          revoke(revokeTarget, {
            onSuccess: () => setRevokeTarget(null),
            onError: (err) => {
              setError(getUserErrorMessage(err));
              setRevokeTarget(null);
            },
          });
        }}
        onClose={() => setRevokeTarget(null)}
      />
    </div>
  );
}
