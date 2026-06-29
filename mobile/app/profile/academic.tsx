import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, SafeAreaView, Text, View } from "react-native";

import { ActionSheet, type ActionItem } from "../../components/app/ActionSheet";
import { BrutalButton } from "../../components/ui/BrutalButton";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { colors } from "../../constants/colors";
import {
  useAcademicProfile,
  useCatalogCourseSlots,
  useCatalogCurriculaemesters,
  useCatalogCurricula,
  useUpdateAcademicProfile,
} from "../../hooks/useCatalog";
import {
  defaultSubjectIds,
  MAX_ACADEMIC_SUBJECTS,
  resolveSelectedSubjectIds,
} from "../../lib/academic-profile";
import { getErrorMessage } from "../../lib/api-error";
import { useToastStore } from "../../stores/toast-store";

export default function AcademicProfileScreen() {
  const router = useRouter();
  const { data: curricula } = useCatalogCurricula();
  const { data: profile, isLoading: isProfileLoading } = useAcademicProfile();

  const [curriculumId, setcurriculumId] = useState<string | null>(null);
  const [semesterId, setSemesterId] = useState<string | null>(null);
  const [subjectIds, setSubjectIds] = useState<string[] | null>(null);
  const [showCurriculumPicker, setshowCurriculumPicker] = useState(false);
  const [showSemesterPicker, setShowSemesterPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const curriculumFromProfile = profile?.curriculum?.id ?? null;
  const semesterFromProfile = profile?.currentSemester?.id ?? null;
  const subjectsFromProfile = profile?.currentSubjects.map((s) => s.id) ?? [];

  const effectivecurriculumId = curriculumId ?? curriculumFromProfile;
  const effectiveSemesterId = semesterId ?? semesterFromProfile;

  const { data: curriculumSemesters } = useCatalogCurriculaemesters(effectivecurriculumId ?? undefined);
  const { data: curriculum } = useCatalogCourseSlots(
    effectivecurriculumId ?? undefined,
    effectiveSemesterId ?? undefined,
  );

  const availableSemesters = useMemo(
    () =>
      (curriculumSemesters ?? [])
        .filter((link) => link.isActive && link.semester)
        .map((link) => link.semester!)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [curriculumSemesters],
  );

  const availableSubjects = useMemo(() => {
    const subjects = (curriculum ?? [])
      .map((c) => c.subject)
      .filter((s): s is NonNullable<typeof s> => s !== null);
    return Array.from(new Map(subjects.map((s) => [s.id, s])).values()).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }, [curriculum]);

  const selectionMatchesProfile =
    effectivecurriculumId === curriculumFromProfile && effectiveSemesterId === semesterFromProfile;

  const selectedSubjectIds = resolveSelectedSubjectIds({
    subjectIds,
    selectionMatchesProfile,
    subjectsFromProfile,
    availableSubjects,
  });

  const subjectsOverLimit = availableSubjects.length > MAX_ACADEMIC_SUBJECTS;

  const selectedCurriculum = curricula?.find((m) => m.id === effectivecurriculumId);
  const selectedSemester = availableSemesters.find((s) => s.id === effectiveSemesterId);
  const isComplete = Boolean(profile?.isComplete);

  const updateProfile = useUpdateAcademicProfile();

  function toggleSubject(id: string) {
    setError(null);
    const next = selectedSubjectIds.includes(id)
      ? selectedSubjectIds.filter((s) => s !== id)
      : [...selectedSubjectIds, id];
    setSubjectIds(next);
  }

  function handleSave() {
    if (!effectivecurriculumId) {
      setError("Vui lòng chọn Chương trình đào tạo.");
      return;
    }
    if (!effectiveSemesterId) {
      setError("Vui lòng chọn học kỳ.");
      return;
    }
    const availableSubjectIdSet = new Set(availableSubjects.map((s) => s.id));
    const subjectIdsToSave = selectedSubjectIds.filter((id) => availableSubjectIdSet.has(id));
    if (subjectIdsToSave.length === 0) {
      setError("Vui lòng chọn ít nhất 1 môn.");
      return;
    }
    setError(null);
    updateProfile.mutate(
      {
        curriculumId: effectivecurriculumId,
        currentSemesterId: effectiveSemesterId,
        currentSubjectIds: subjectIdsToSave,
      },
      {
        onSuccess: () => {
          setcurriculumId(null);
          setSemesterId(null);
          setSubjectIds(null);
          useToastStore.getState().show("Đã lưu hồ sơ học thuật.", "success");
        },
        onError: (err) =>
          useToastStore.getState().show(getErrorMessage(err, "Lưu hồ sơ thất bại. Vui lòng thử lại.")),
      },
    );
  }

  const curriculumActions: ActionItem[] = (curricula ?? []).map((m) => ({
    label: `${m.code} — ${m.name}`,
    icon: "school-outline",
    onPress: () => {
      setError(null);
      setcurriculumId(m.id);
      setSemesterId(null);
      setSubjectIds(null);
    },
  }));

  const semesterActions: ActionItem[] = availableSemesters.map((semester) => ({
    label: `${semester.code} — ${semester.name}`,
    icon: "calendar-outline",
    onPress: () => {
      setError(null);
      setSemesterId(semester.id);
      setSubjectIds(null);
    },
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar
        title="Hồ sơ học thuật"
        subtitle={isComplete ? "Đã hoàn thành" : "Chưa hoàn thành"}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
          Mặc định chọn tất cả môn trong học kỳ — bỏ tick môn bạn không học. Mỗi tài liệu tải lên phải
          gắn với một môn trong chương trình đào tạo.
        </Text>

        {/* Major */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 6 }}>Chương trình đào tạo</Text>
          <Pressable
            onPress={() => (curricula?.length ?? 0) > 0 && setshowCurriculumPicker(true)}
            style={{
              borderWidth: 2,
              borderColor: colors.ink,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: colors.surface,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            accessibilityRole="button"
            accessibilityLabel="Chọn Chương trình đào tạo"
          >
            <Text
              style={{
                fontSize: 14,
                flex: 1,
                color: selectedCurriculum ? colors.ink : colors.muted,
                fontWeight: selectedCurriculum ? "700" : "400",
              }}
              numberOfLines={1}
            >
              {selectedCurriculum ? `${selectedCurriculum.code} — ${selectedCurriculum.name}` : "Chọn Chương trình đào tạo…"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Semester */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 6 }}>Học kỳ</Text>
          <Pressable
            onPress={() => effectivecurriculumId && availableSemesters.length > 0 && setShowSemesterPicker(true)}
            disabled={!effectivecurriculumId || availableSemesters.length === 0}
            style={{
              borderWidth: 2,
              borderColor: colors.ink,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: colors.surface,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: effectivecurriculumId && availableSemesters.length > 0 ? 1 : 0.5,
            }}
            accessibilityRole="button"
            accessibilityLabel="Chọn học kỳ"
          >
            <Text
              style={{
                fontSize: 14,
                flex: 1,
                color: selectedSemester ? colors.ink : colors.muted,
                fontWeight: selectedSemester ? "700" : "400",
              }}
              numberOfLines={1}
            >
              {selectedSemester
                ? `${selectedSemester.code} — ${selectedSemester.name}`
                : effectivecurriculumId && availableSemesters.length === 0
                  ? "Chương trình đào tạo chưa có học kỳ"
                  : "Chọn học kỳ…"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Subjects */}
        <View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>Môn đang học</Text>
            {effectiveSemesterId && availableSubjects.length > 0 && (
              <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "600" }}>
                Đã chọn {selectedSubjectIds.length} / {availableSubjects.length}
              </Text>
            )}
          </View>
          {effectiveSemesterId && availableSubjects.length > 0 && (
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <Pressable
                onPress={() => {
                  setError(null);
                  setSubjectIds(defaultSubjectIds(availableSubjects));
                }}
                style={{
                  borderWidth: 2,
                  borderColor: colors.ink,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }}>Chọn tất cả</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setError(null);
                  setSubjectIds([]);
                }}
                style={{
                  borderWidth: 2,
                  borderColor: colors.ink,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }}>Bỏ chọn</Text>
              </Pressable>
            </View>
          )}
          {subjectsOverLimit && (
            <Text style={{ fontSize: 12, color: colors.error, fontWeight: "600", marginBottom: 8, lineHeight: 17 }}>
              Học kỳ có {availableSubjects.length} môn; hệ thống chọn tối đa {MAX_ACADEMIC_SUBJECTS} môn
              theo mã môn. Bỏ tick môn không học trước khi lưu.
            </Text>
          )}
          <View style={{ borderWidth: 2, borderColor: colors.ink, borderRadius: 12, backgroundColor: colors.bg, padding: 10, gap: 8 }}>
            {isProfileLoading ? (
              <ActivityIndicator color={colors.fptBlue} />
            ) : !effectivecurriculumId || !effectiveSemesterId ? (
              <Text style={{ fontSize: 13, color: colors.muted, padding: 4 }}>
                Chọn Chương trình đào tạo và học kỳ để hiển thị danh sách môn.
              </Text>
            ) : availableSubjects.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.muted, padding: 4 }}>
                Không có môn phù hợp với Chương trình đào tạo và học kỳ đã chọn.
              </Text>
            ) : (
              availableSubjects.map((s) => {
                const checked = selectedSubjectIds.includes(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => toggleSubject(s.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      borderWidth: 2,
                      borderColor: colors.ink,
                      backgroundColor: colors.surface,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                  >
                    <Ionicons
                      name={checked ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={checked ? colors.fptGreen : colors.muted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: colors.ink }}>{s.code}</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>
                        {s.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        {error && <Text style={{ fontSize: 13, color: colors.error, fontWeight: "600" }}>{error}</Text>}

        <BrutalButton label="Lưu hồ sơ" onPress={handleSave} loading={updateProfile.isPending} fullWidth />
      </ScrollView>

      <ActionSheet
        visible={showCurriculumPicker}
        title="Chọn Chương trình đào tạo"
        actions={curriculumActions}
        onDismiss={() => setshowCurriculumPicker(false)}
      />
      <ActionSheet
        visible={showSemesterPicker}
        title="Chọn học kỳ"
        actions={semesterActions}
        onDismiss={() => setShowSemesterPicker(false)}
      />
    </SafeAreaView>
  );
}
