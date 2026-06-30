"use client";

import { useCallback, useMemo, useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalModal } from "@/components/ui/BrutalModal";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import {
  defaultSubjectIds,
  MAX_ACADEMIC_SUBJECTS,
  resolveSelectedSubjectIds,
} from "@/lib/academic-profile";
import { cn } from "@/lib/cn";
import { getUserErrorMessage } from "@/lib/errors";
import {
  useAcademicProfile,
  useCatalogCourseSlots,
  useCatalogCurriculumSemesters,
  useCatalogCurricula,
  type AcademicProfile,
  type CatalogCourseSlot,
} from "@/lib/queries/catalog";
import { useUpdateAcademicProfile } from "@/lib/queries/users";

const ONBOARDING_SKIP_KEY = "apms-onboarding-skipped";

function uniqueSubjects(curriculum: CatalogCourseSlot[] | undefined) {
  const subjects =
    curriculum
      ?.map((c) => c.subject)
      .filter((s): s is NonNullable<typeof s> => s !== null) ?? [];
  return Array.from(new Map(subjects.map((s) => [s.id, s])).values()).sort((a, b) =>
    a.code.localeCompare(b.code),
  );
}

const STEPS = [
  { id: 1, label: "Chương trình đào tạo" },
  { id: 2, label: "Học kỳ" },
  { id: 3, label: "Môn học" },
] as const;

function profileSeed(profile: AcademicProfile | undefined) {
  return {
    curriculumId: profile?.curriculum?.id ?? "",
    semesterId: profile?.currentSemester?.id ?? "",
    subjectIds:
      profile && profile.currentSubjects.length > 0
        ? profile.currentSubjects.map((s) => s.id)
        : null,
  };
}

interface WizardFormProps {
  profile: AcademicProfile | undefined;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

function WizardForm({ profile, onClose, onComplete, onSkip }: WizardFormProps) {
  const seed = profileSeed(profile);
  const [step, setStep] = useState(1);
  const [curriculumId, setCurriculumId] = useState(seed.curriculumId);
  const [semesterId, setSemesterId] = useState(seed.semesterId);
  const [subjectIds, setSubjectIds] = useState<string[] | null>(seed.subjectIds);
  const [error, setError] = useState<string | null>(null);

  const { data: curricula, isLoading: isCurriculaLoading } = useCatalogCurricula();
  const { data: curriculum, isLoading: isCurriculumLoading } = useCatalogCourseSlots(
    curriculumId || undefined,
    semesterId || undefined,
  );
  const { data: curriculumSemesters } = useCatalogCurriculumSemesters(curriculumId || undefined);
  const updateAcademic = useUpdateAcademicProfile();

  const availableSemesters =
    curriculumSemesters
      ?.filter((link) => link.isActive && link.semester)
      .map((link) => link.semester!)
      .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  const availableSubjects = useMemo(() => uniqueSubjects(curriculum), [curriculum]);

  const selectedSubjectIds = resolveSelectedSubjectIds({
    subjectIds,
    selectionMatchesProfile: false,
    subjectsFromProfile: [],
    availableSubjects,
  });

  const handleSave = useCallback(() => {
    setError(null);
    if (!curriculumId || !semesterId) {
      setError("Chọn đủ CTĐT và học kỳ trước khi lưu.");
      return;
    }
    if (selectedSubjectIds.length === 0) {
      setError("Chọn ít nhất một môn đang học.");
      return;
    }
    updateAcademic.mutate(
      { curriculumId, currentSemesterId: semesterId, currentSubjectIds: selectedSubjectIds },
      {
        onSuccess: () => {
          sessionStorage.removeItem(ONBOARDING_SKIP_KEY);
          onComplete();
          onClose();
        },
        onError: (err) => setError(getUserErrorMessage(err)),
      },
    );
  }, [
    curriculumId,
    semesterId,
    selectedSubjectIds,
    updateAcademic,
    onComplete,
    onClose,
  ]);

  return (
    <>
      <div className="mb-6 flex gap-2">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={cn(
              "flex-1 rounded-lg border-2 border-brutal-ink px-2 py-2 text-center text-xs font-bold",
              step >= s.id ? "bg-brutal-primary text-white" : "bg-brutal-bg text-brutal-muted",
            )}
          >
            {s.label}
          </div>
        ))}
      </div>

      {error && <ErrorAlert message={error} className="mb-4" />}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-brutal-muted">Bạn đang theo CTĐT nào?</p>
          {isCurriculaLoading ? (
            <p className="text-sm text-brutal-muted">Đang tải…</p>
          ) : (
            <select
              value={curriculumId}
              onChange={(e) => {
                setCurriculumId(e.target.value);
                setSemesterId("");
                setSubjectIds(null);
              }}
              className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2.5 text-sm"
              data-initial-focus
            >
              <option value="">Chọn CTĐT</option>
              {curricula?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-brutal-muted">Học kỳ nào bạn đang theo?</p>
          <select
            value={semesterId}
            onChange={(e) => {
              setSemesterId(e.target.value);
              setSubjectIds(null);
            }}
            disabled={!curriculumId}
            className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2.5 text-sm disabled:opacity-50"
            data-initial-focus
          >
            <option value="">Chọn học kỳ</option>
            {availableSemesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.code} — {semester.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-brutal-muted">
            Đã chọn sẵn các môn trong kỳ — bỏ tick môn bạn không học.
          </p>
          {isCurriculumLoading ? (
            <p className="text-sm text-brutal-muted">Đang tải môn học…</p>
          ) : availableSubjects.length === 0 ? (
            <p className="text-sm text-brutal-muted">Chưa có môn trong học kỳ này.</p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border-2 border-brutal-ink bg-brutal-bg p-3">
              {availableSubjects.map((subject) => {
                const checked = selectedSubjectIds.includes(subject.id);
                return (
                  <label
                    key={subject.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSubjectIds((prev) => {
                          const base = prev ?? selectedSubjectIds;
                          return checked
                            ? base.filter((id) => id !== subject.id)
                            : [...base, subject.id];
                        });
                      }}
                      className="h-4 w-4"
                    />
                    <span>
                      {subject.code} — {subject.name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {availableSubjects.length > MAX_ACADEMIC_SUBJECTS && (
            <p className="text-xs text-brutal-muted">
              Tối đa {MAX_ACADEMIC_SUBJECTS} môn — bỏ tick môn không học trước khi lưu.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {step > 1 && (
          <BrutalButton
            type="button"
            variant="ghost"
            className="!w-auto"
            onClick={() => setStep((s) => s - 1)}
            disabled={updateAcademic.isPending}
          >
            Quay lại
          </BrutalButton>
        )}
        <div className="flex-1" />
        <BrutalButton
          type="button"
          variant="ghost"
          className="!w-auto"
          onClick={onSkip}
          disabled={updateAcademic.isPending}
        >
          Để sau
        </BrutalButton>
        {step < 3 ? (
          <BrutalButton
            type="button"
            variant="primary"
            className="!w-auto"
            disabled={(step === 1 && !curriculumId) || (step === 2 && !semesterId)}
            onClick={() => {
              if (step === 2 && semesterId && subjectIds === null && availableSubjects.length > 0) {
                setSubjectIds(defaultSubjectIds(availableSubjects));
              }
              setStep((s) => s + 1);
            }}
          >
            Tiếp tục
          </BrutalButton>
        ) : (
          <BrutalButton
            type="button"
            variant="primary"
            className="!w-auto"
            loading={updateAcademic.isPending}
            onClick={handleSave}
          >
            Lưu hồ sơ
          </BrutalButton>
        )}
      </div>
    </>
  );
}

interface AcademicProfileWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
  profile: AcademicProfile | undefined;
}

export function AcademicProfileWizard({
  open,
  onClose,
  onComplete,
  onSkip,
  profile,
}: AcademicProfileWizardProps) {
  return (
    <BrutalModal
      open={open}
      onClose={onClose}
      title="Thiết lập hồ sơ học thuật"
      description="Vài bước ngắn để Drive sắp xếp tài liệu theo môn bạn đang học."
      size="lg"
      preventClose={false}
    >
      {open && (
        <WizardForm
          key={profile?.curriculum?.id ?? "new"}
          profile={profile}
          onClose={onClose}
          onComplete={onComplete}
          onSkip={onSkip}
        />
      )}
    </BrutalModal>
  );
}

export function OnboardingGate() {
  const { data: profile, isLoading } = useAcademicProfile();
  const [skipped, setSkipped] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem(ONBOARDING_SKIP_KEY) === "1",
  );
  const [dismissed, setDismissed] = useState(false);

  const shouldShow =
    !isLoading && profile && !profile.isComplete && !skipped && !dismissed;

  if (!shouldShow) return null;

  return (
    <AcademicProfileWizard
      open
      profile={profile}
      onClose={() => setDismissed(true)}
      onComplete={() => setDismissed(true)}
      onSkip={() => {
        sessionStorage.setItem(ONBOARDING_SKIP_KEY, "1");
        setSkipped(true);
      }}
    />
  );
}
