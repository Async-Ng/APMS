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
  useCatalogCurriculum,
  useCatalogMajors,
  useUpdateAcademicProfile,
} from "../../hooks/useCatalog";
import { getErrorMessage } from "../../lib/api-error";
import { useToastStore } from "../../stores/toast-store";

const SEMESTERS = Array.from({ length: 9 }, (_, i) => i + 1);

export default function AcademicProfileScreen() {
  const router = useRouter();
  const { data: majors } = useCatalogMajors();
  const { data: profile, isLoading: isProfileLoading } = useAcademicProfile();

  const [majorId, setMajorId] = useState<string | null>(null);
  const [semesterNumber, setSemesterNumber] = useState<number | null>(null);
  const [subjectIds, setSubjectIds] = useState<string[] | null>(null);
  const [showMajorPicker, setShowMajorPicker] = useState(false);
  const [showSemesterPicker, setShowSemesterPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveMajorId = majorId ?? profile?.major?.id ?? null;
  const effectiveSemester = semesterNumber ?? profile?.currentSemester ?? null;
  const effectiveSubjectIds = subjectIds ?? profile?.currentSubjects.map((s) => s.id) ?? [];

  const { data: curriculum } = useCatalogCurriculum(effectiveMajorId ?? undefined, effectiveSemester ?? undefined);

  const availableSubjects = useMemo(() => {
    const subjects = (curriculum ?? [])
      .map((c) => c.subject)
      .filter((s): s is NonNullable<typeof s> => s !== null);
    return Array.from(new Map(subjects.map((s) => [s.id, s])).values()).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }, [curriculum]);

  const selectedMajor = majors?.find((m) => m.id === effectiveMajorId);
  const isComplete = Boolean(profile?.isComplete);

  const updateProfile = useUpdateAcademicProfile();

  function toggleSubject(id: string) {
    setError(null);
    const next = effectiveSubjectIds.includes(id)
      ? effectiveSubjectIds.filter((s) => s !== id)
      : [...effectiveSubjectIds, id];
    setSubjectIds(next);
  }

  function handleSave() {
    if (!effectiveMajorId) {
      setError("Vui lòng chọn ngành.");
      return;
    }
    if (!effectiveSemester) {
      setError("Vui lòng chọn học kỳ.");
      return;
    }
    if (effectiveSubjectIds.length === 0) {
      setError("Vui lòng chọn ít nhất 1 môn.");
      return;
    }
    setError(null);
    updateProfile.mutate(
      { majorId: effectiveMajorId, currentSemester: effectiveSemester, currentSubjectIds: effectiveSubjectIds },
      {
        onSuccess: () => useToastStore.getState().show("Đã lưu hồ sơ học thuật.", "success"),
        onError: (err) =>
          useToastStore.getState().show(getErrorMessage(err, "Lưu hồ sơ thất bại. Vui lòng thử lại.")),
      },
    );
  }

  const majorActions: ActionItem[] = (majors ?? []).map((m) => ({
    label: `${m.code} — ${m.name}`,
    icon: "school-outline",
    onPress: () => {
      setError(null);
      setMajorId(m.id);
      setSemesterNumber(null);
      setSubjectIds(null);
    },
  }));

  const semesterActions: ActionItem[] = SEMESTERS.map((n) => ({
    label: `Học kỳ ${n}`,
    icon: "calendar-outline",
    onPress: () => {
      setError(null);
      setSemesterNumber(n);
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
          Mỗi tài liệu bạn tải lên phải gắn với một môn trong chương trình đào tạo. Cập nhật ngành, học kỳ
          và các môn đang học để tải tệp và dùng Diễn đàn.
        </Text>

        {/* Major */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 6 }}>Ngành</Text>
          <Pressable
            onPress={() => (majors?.length ?? 0) > 0 && setShowMajorPicker(true)}
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
            accessibilityLabel="Chọn ngành"
          >
            <Text
              style={{
                fontSize: 14,
                flex: 1,
                color: selectedMajor ? colors.ink : colors.muted,
                fontWeight: selectedMajor ? "700" : "400",
              }}
              numberOfLines={1}
            >
              {selectedMajor ? `${selectedMajor.code} — ${selectedMajor.name}` : "Chọn ngành…"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Semester */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 6 }}>Học kỳ</Text>
          <Pressable
            onPress={() => effectiveMajorId && setShowSemesterPicker(true)}
            disabled={!effectiveMajorId}
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
              opacity: effectiveMajorId ? 1 : 0.5,
            }}
            accessibilityRole="button"
            accessibilityLabel="Chọn học kỳ"
          >
            <Text
              style={{
                fontSize: 14,
                flex: 1,
                color: effectiveSemester ? colors.ink : colors.muted,
                fontWeight: effectiveSemester ? "700" : "400",
              }}
            >
              {effectiveSemester ? `Học kỳ ${effectiveSemester}` : "Chọn học kỳ…"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Subjects */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 6 }}>Môn đang học</Text>
          <View style={{ borderWidth: 2, borderColor: colors.ink, borderRadius: 12, backgroundColor: colors.bg, padding: 10, gap: 8 }}>
            {isProfileLoading ? (
              <ActivityIndicator color={colors.fptBlue} />
            ) : !effectiveMajorId || !effectiveSemester ? (
              <Text style={{ fontSize: 13, color: colors.muted, padding: 4 }}>
                Chọn ngành và học kỳ để hiển thị danh sách môn.
              </Text>
            ) : availableSubjects.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.muted, padding: 4 }}>
                Không có môn phù hợp với ngành và học kỳ đã chọn.
              </Text>
            ) : (
              availableSubjects.map((s) => {
                const checked = effectiveSubjectIds.includes(s.id);
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
        visible={showMajorPicker}
        title="Chọn ngành"
        actions={majorActions}
        onDismiss={() => setShowMajorPicker(false)}
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
