"use client";

import { useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalModal } from "@/components/ui/BrutalModal";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { getUserErrorMessage } from "@/lib/errors";
import {
  useAcademicProfile,
  useCatalogCurricula,
  type AcademicProfile,
} from "@/lib/queries/catalog";
import { useUpdateAcademicProfile } from "@/lib/queries/users";
import { useAuthStore } from "@/stores/auth-store";

const ONBOARDING_SKIP_KEY = "apms-onboarding-skipped";

interface WizardFormProps {
  profile: AcademicProfile | undefined;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

function WizardForm({ profile, onClose, onComplete, onSkip }: WizardFormProps) {
  const [curriculumId, setCurriculumId] = useState(profile?.curriculum?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const { data: curricula, isLoading: isCurriculaLoading } = useCatalogCurricula();
  const updateAcademic = useUpdateAcademicProfile();

  function handleSave() {
    setError(null);
    if (!curriculumId) {
      setError("Chọn CTĐT trước khi lưu.");
      return;
    }
    updateAcademic.mutate(
      { curriculumId },
      {
        onSuccess: () => {
          sessionStorage.removeItem(ONBOARDING_SKIP_KEY);
          onComplete();
          onClose();
        },
        onError: (err) => setError(getUserErrorMessage(err)),
      },
    );
  }

  return (
    <>
      {error && <ErrorAlert message={error} className="mb-4" />}

      <div className="space-y-3">
        <p className="text-sm text-brutal-muted">
          Chọn chương trình đào tạo của bạn. Khi tải tài liệu, bạn sẽ chọn môn cụ thể
          trong CTĐT đó.
        </p>
        {isCurriculaLoading ? (
          <p className="text-sm text-brutal-muted">Đang tải…</p>
        ) : (
          <select
            value={curriculumId}
            onChange={(e) => setCurriculumId(e.target.value)}
            className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2.5 text-sm"
            data-initial-focus
          >
            <option value="">Chọn CTĐT</option>
            {curricula?.map((curriculum) => (
              <option key={curriculum.id} value={curriculum.id}>
                {curriculum.code} — {curriculum.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <BrutalButton
          type="button"
          variant="ghost"
          className="!w-auto"
          onClick={onSkip}
          disabled={updateAcademic.isPending}
        >
          Để sau
        </BrutalButton>
        <div className="flex-1" />
        <BrutalButton
          type="button"
          variant="primary"
          className="!w-auto"
          loading={updateAcademic.isPending}
          onClick={handleSave}
        >
          Lưu hồ sơ
        </BrutalButton>
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
      description="Chọn CTĐT để Drive và Thư viện gợi ý tài liệu phù hợp."
      size="md"
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
  const user = useAuthStore((state) => state.user);
  const { data: profile, isLoading } = useAcademicProfile();
  const [skipped, setSkipped] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem(ONBOARDING_SKIP_KEY) === "1",
  );
  const [dismissed, setDismissed] = useState(false);

  const shouldShow =
    user?.role !== "admin" &&
    !isLoading &&
    profile &&
    !profile.isComplete &&
    !skipped &&
    !dismissed;

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
