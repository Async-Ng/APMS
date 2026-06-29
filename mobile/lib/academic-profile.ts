/** Max subjects per academic profile (SRS §6.4, API validator). */
export const MAX_ACADEMIC_SUBJECTS = 30;

export interface AcademicSubjectOption {
  id: string;
  code: string;
}

export function defaultSubjectIds(subjects: AcademicSubjectOption[]): string[] {
  return subjects
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .slice(0, MAX_ACADEMIC_SUBJECTS)
    .map((s) => s.id);
}

export function resolveSelectedSubjectIds(options: {
  subjectIds: string[] | null;
  selectionMatchesProfile: boolean;
  subjectsFromProfile: string[];
  availableSubjects: AcademicSubjectOption[];
}): string[] {
  const { subjectIds, selectionMatchesProfile, subjectsFromProfile, availableSubjects } = options;
  if (subjectIds !== null) return subjectIds;
  if (selectionMatchesProfile && subjectsFromProfile.length > 0) return subjectsFromProfile;
  if (availableSubjects.length > 0) return defaultSubjectIds(availableSubjects);
  return [];
}
