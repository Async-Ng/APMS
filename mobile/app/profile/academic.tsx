import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, SafeAreaView, Text, View } from "react-native";

import { ActionSheet, type ActionItem } from "../../components/app/ActionSheet";
import { BrutalButton } from "../../components/ui/BrutalButton";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { colors } from "../../constants/colors";
import {
  useAcademicProfile,
  useCatalogCurricula,
  useUpdateAcademicProfile,
} from "../../hooks/useCatalog";
import { getErrorMessage } from "../../lib/api-error";
import { useToastStore } from "../../stores/toast-store";

export default function AcademicProfileScreen() {
  const router = useRouter();
  const { data: curricula, isLoading: curriculaLoading } = useCatalogCurricula();
  const { data: profile } = useAcademicProfile();

  const [curriculumId, setCurriculumId] = useState<string | null>(null);
  const [showCurriculumPicker, setShowCurriculumPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const curriculumFromProfile = profile?.curriculum?.id ?? null;
  const effectiveCurriculumId = curriculumId ?? curriculumFromProfile;
  const selectedCurriculum = curricula?.find((m) => m.id === effectiveCurriculumId);
  const isComplete = Boolean(profile?.isComplete);

  const updateProfile = useUpdateAcademicProfile();

  function handleSave() {
    if (!effectiveCurriculumId) {
      setError("Vui lòng chọn Chương trình đào tạo.");
      return;
    }
    setError(null);
    updateProfile.mutate(
      { curriculumId: effectiveCurriculumId },
      {
        onSuccess: () => {
          setCurriculumId(null);
          useToastStore.getState().show("Đã lưu hồ sơ học thuật.", "success");
        },
        onError: (err) =>
          useToastStore
            .getState()
            .show(getErrorMessage(err, "Lưu hồ sơ thất bại. Vui lòng thử lại.")),
      },
    );
  }

  const curriculumActions: ActionItem[] = (curricula ?? []).map((m) => ({
    label: `${m.code} — ${m.name}`,
    icon: "school-outline",
    onPress: () => {
      setError(null);
      setCurriculumId(m.id);
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
        {!isComplete && (
          <View
            style={{
              borderWidth: 3,
              borderColor: colors.ink,
              borderRadius: 14,
              backgroundColor: "#FFE600",
              padding: 14,
              shadowColor: colors.ink,
              shadowOffset: { width: 3, height: 3 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.ink, marginBottom: 4 }}>
              Cần chọn chương trình học
            </Text>
            <Text style={{ fontSize: 13, color: colors.ink, lineHeight: 18, fontWeight: "600" }}>
              APMS dùng thông tin này để hiện đúng môn học khi tải lên, tìm kiếm và xem thư viện.
            </Text>
          </View>
        )}

        <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
          Hồ sơ học thuật chỉ cần Chương trình đào tạo. Khi tải tài liệu, bạn sẽ chọn môn cụ
          thể trong CTĐT đó.
        </Text>

        <View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 6 }}>
            Chương trình đào tạo
          </Text>
          <Pressable
            onPress={() => {
              if (curriculaLoading) return;
              if ((curricula?.length ?? 0) === 0) {
                useToastStore.getState().show("Chưa có chương trình đào tạo nào.");
                return;
              }
              setShowCurriculumPicker(true);
            }}
            style={{
              borderWidth: 2,
              borderColor: colors.ink,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              minHeight: 56,
              backgroundColor: colors.surface,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            accessibilityRole="button"
            accessibilityLabel="Chọn Chương trình đào tạo"
          >
            {curriculaLoading ? (
              <ActivityIndicator size="small" color={colors.fptBlue} />
            ) : (
              <Text
                style={{
                  fontSize: 14,
                  flex: 1,
                  color: selectedCurriculum ? colors.ink : colors.muted,
                  fontWeight: selectedCurriculum ? "700" : "400",
                  lineHeight: 20,
                }}
                numberOfLines={2}
              >
                {selectedCurriculum
                  ? `${selectedCurriculum.code} — ${selectedCurriculum.name}`
                  : "Chọn Chương trình đào tạo…"}
              </Text>
            )}
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {error && <Text style={{ fontSize: 13, color: colors.error, fontWeight: "600" }}>{error}</Text>}

        <BrutalButton
          label="Lưu hồ sơ"
          onPress={handleSave}
          loading={updateProfile.isPending}
          fullWidth
        />
      </ScrollView>

      <ActionSheet
        visible={showCurriculumPicker}
        title="Chọn Chương trình đào tạo"
        actions={curriculumActions}
        onDismiss={() => setShowCurriculumPicker(false)}
      />
    </SafeAreaView>
  );
}
