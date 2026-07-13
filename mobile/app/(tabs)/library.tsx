import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ActionSheet, type ActionItem } from "../../components/app/ActionSheet";
import { EmptyState } from "../../components/ui/EmptyState";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SkeletonList } from "../../components/ui/SkeletonCard";
import { colors } from "../../constants/colors";
import {
  useCatalogCourseSlots,
  useCatalogCurricula,
  useCatalogCurriculumSemesters,
  useCatalogSemesters,
  type CatalogCurriculum,
  type CatalogSemester,
  type CatalogSubject,
} from "../../hooks/useCatalog";
import { usePublicDocuments } from "../../hooks/useDocuments";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
  if (mimeType.includes("pdf")) return { name: "document-text", color: "#E53E3E" };
  if (mimeType.includes("word") || mimeType.includes("document")) return { name: "document", color: colors.fptBlue };
  if (mimeType.includes("presentation")) return { name: "easel", color: colors.fptOrange };
  return { name: "document-outline", color: colors.muted };
}

export default function LibraryScreen() {
  const router = useRouter();

  // Search and Debounce
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  // Segment: "Gợi ý" (match: "auto") and "Duyệt" (match: "all")
  const [segment, setSegment] = useState<"auto" | "all">("auto");

  // Filters state
  const [selectedCurriculum, setSelectedCurriculum] = useState<CatalogCurriculum | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<CatalogSemester | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<CatalogSubject | null>(null);

  // Active filter ActionSheets
  const [activeSheet, setActiveSheet] = useState<"curriculum" | "semester" | "subject" | null>(null);

  // Query Catalog Options
  const { data: curricula = [] } = useCatalogCurricula();
  const { data: allSemesters = [] } = useCatalogSemesters();
  
  // Fetch curriculum-specific semesters if curriculum is selected
  const { data: curriculumSemesters = [] } = useCatalogCurriculumSemesters(
    selectedCurriculum?.id || undefined
  );
  
  // Decide which semesters list to display
  const semestersList = selectedCurriculum 
    ? curriculumSemesters.map(cs => cs.semester).filter((s): s is CatalogSemester => !!s)
    : allSemesters;

  // Fetch course slots of selected curriculum to extract subjects
  const slotsQuery = useCatalogCourseSlots(
    selectedCurriculum?.id || undefined,
    selectedSemester?.id || undefined
  );

  const subjects = slotsQuery.data
    ? Array.from(
        new Map(
          slotsQuery.data
            .filter((s) => s.subject)
            .map((s) => [s.subject!.id, s.subject!])
        ).values()
      )
    : [];

  // Reset semester/subject when curriculum changes
  useEffect(() => {
    setSelectedSemester(null);
    setSelectedSubject(null);
  }, [selectedCurriculum]);

  // Reset subject when semester changes
  useEffect(() => {
    setSelectedSubject(null);
  }, [selectedSemester]);

  // Query Public Documents
  const queryParams = {
    search: debouncedSearch || undefined,
    match: segment,
    curriculumId: segment === "all" ? selectedCurriculum?.id || undefined : undefined,
    semesterId: segment === "all" ? selectedSemester?.id || undefined : undefined,
    subjectId: segment === "all" ? selectedSubject?.id || undefined : undefined,
  };

  const { data: publicData, isLoading, refetch, isRefetching } = usePublicDocuments(queryParams);
  const documents = publicData?.documents ?? [];

  // Build curriculum filter actions
  const curriculumActions: ActionItem[] = [
    {
      label: "Tất cả chương trình",
      icon: "layers-outline",
      onPress: () => setSelectedCurriculum(null),
    },
    ...curricula.map((cur) => ({
      label: `${cur.code} - ${cur.name}`,
      icon: "book-outline" as const,
      onPress: () => setSelectedCurriculum(cur),
    })),
  ];

  // Build semester filter actions
  const semesterActions: ActionItem[] = [
    {
      label: "Tất cả kỳ học",
      icon: "calendar-outline",
      onPress: () => setSelectedSemester(null),
    },
    ...semestersList.map((sem) => ({
      label: sem.name,
      icon: "time-outline" as const,
      onPress: () => setSelectedSemester(sem),
    })),
  ];

  // Build subject filter actions
  const subjectActions: ActionItem[] = [
    {
      label: "Tất cả môn học",
      icon: "library-outline",
      onPress: () => setSelectedSubject(null),
    },
    ...subjects.map((sub) => ({
      label: `${sub.code} - ${sub.name}`,
      icon: "reader-outline" as const,
      onPress: () => setSelectedSubject(sub),
    })),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar title="Thư viện công khai" subtitle="Tài liệu được chia sẻ công khai" />

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: colors.surface,
            borderWidth: 3,
            borderColor: colors.ink,
            borderRadius: 14,
            paddingHorizontal: 14,
            shadowColor: colors.ink,
            shadowOffset: { width: 4, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 4,
            minHeight: 52,
          }}
        >
          <Ionicons name="search" size={20} color={colors.ink} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm kiếm tài liệu công khai..."
            placeholderTextColor={colors.muted}
            style={{ flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 12 }}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Segments: Gợi ý vs Duyệt */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Pressable
          onPress={() => setSegment("auto")}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            borderWidth: 2,
            borderColor: colors.ink,
            borderRadius: 12,
            paddingVertical: 10,
            backgroundColor: segment === "auto" ? colors.fptOrange : pressed ? "#F0F0F0" : colors.surface,
          })}
          accessibilityRole="tab"
          accessibilityState={{ selected: segment === "auto" }}
        >
          <Ionicons name="sparkles-outline" size={16} color={segment === "auto" ? colors.onBrand : colors.ink} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: segment === "auto" ? colors.onBrand : colors.ink }}>
            Gợi ý
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSegment("all")}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            borderWidth: 2,
            borderColor: colors.ink,
            borderRadius: 12,
            paddingVertical: 10,
            backgroundColor: segment === "all" ? colors.fptOrange : pressed ? "#F0F0F0" : colors.surface,
          })}
          accessibilityRole="tab"
          accessibilityState={{ selected: segment === "all" }}
        >
          <Ionicons name="grid-outline" size={16} color={segment === "all" ? colors.onBrand : colors.ink} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: segment === "all" ? colors.onBrand : colors.ink }}>
            Duyệt
          </Text>
        </Pressable>
      </View>

      {/* Filters (only visible when Duyệt is selected) */}
      {segment === "all" && (
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 10, marginBottom: 6 }}>
          {/* Curriculum Filter */}
          <Pressable
            onPress={() => setActiveSheet("curriculum")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              borderWidth: 2,
              borderColor: colors.ink,
              borderRadius: 8,
              paddingVertical: 6,
              paddingHorizontal: 4,
              backgroundColor: selectedCurriculum ? "#FFE600" : colors.surface,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
              {selectedCurriculum ? selectedCurriculum.code : "Chương trình"}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.ink} />
          </Pressable>

          {/* Semester Filter */}
          <Pressable
            onPress={() => setActiveSheet("semester")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              borderWidth: 2,
              borderColor: colors.ink,
              borderRadius: 8,
              paddingVertical: 6,
              paddingHorizontal: 4,
              backgroundColor: selectedSemester ? "#FFE600" : colors.surface,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
              {selectedSemester ? selectedSemester.name : "Kỳ học"}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.ink} />
          </Pressable>

          {/* Subject Filter */}
          <Pressable
            onPress={() => setActiveSheet("subject")}
            disabled={!selectedCurriculum}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              borderWidth: 2,
              borderColor: colors.ink,
              borderRadius: 8,
              paddingVertical: 6,
              paddingHorizontal: 4,
              backgroundColor: selectedSubject ? "#FFE600" : colors.surface,
              opacity: selectedCurriculum ? 1 : 0.5,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
              {selectedSubject ? selectedSubject.code : "Môn học"}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.ink} />
          </Pressable>
        </View>
      )}

      {/* Main List */}
      {isLoading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={4} />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.fptBlue}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="library-outline"
              title="Không tìm thấy tài liệu"
              description={
                segment === "auto"
                  ? "Hãy chắc chắn bạn đã cấu hình hồ sơ học thuật đầy đủ để nhận gợi ý."
                  : "Không có tài liệu nào khớp với bộ lọc hiện tại của bạn."
              }
            />
          }
          renderItem={({ item }) => {
            const icon = getFileIcon(item.mimeType);
            const subjectLabel = item.courseSlot?.subject
              ? `${item.courseSlot.subject.code} - ${item.courseSlot.subject.name}`
              : null;
            const semesterLabel = item.courseSlot?.semester ? item.courseSlot.semester.code : null;
            const ownerLabel = item.owner?.displayName || "Ẩn danh";

            let matchBadge = null;
            if (item.matchType === "exact_course") {
              matchBadge = { text: "Trùng khớp", bg: colors.fptGreen, color: colors.onBrand };
            } else if (item.matchType === "same_subject_other_semester") {
              matchBadge = { text: "Liên quan", bg: colors.fptBlue, color: colors.onBrand };
            }

            return (
              <Pressable
                onPress={() => router.push(`/documents/${item.id}`)}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderWidth: 3,
                  borderColor: colors.ink,
                  borderRadius: 14,
                  padding: 14,
                  gap: 8,
                  shadowColor: colors.ink,
                  shadowOffset: pressed ? { width: 0, height: 0 } : { width: 4, height: 4 },
                  shadowOpacity: pressed ? 0 : 1,
                  shadowRadius: 0,
                  elevation: pressed ? 0 : 4,
                  transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : [],
                })}
              >
                <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: colors.ink,
                      backgroundColor: "#F8F8F8",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={icon.name} size={22} color={icon.color} />
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink, flex: 1 }} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {matchBadge && (
                        <View style={{ backgroundColor: matchBadge.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1.5, borderColor: colors.ink }}>
                          <Text style={{ fontSize: 10, fontWeight: "800", color: matchBadge.color }}>{matchBadge.text}</Text>
                        </View>
                      )}
                    </View>

                    {subjectLabel && (
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.fptBlue }} numberOfLines={1}>
                        Môn: {subjectLabel} {semesterLabel ? `(${semesterLabel})` : ""}
                      </Text>
                    )}

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        Đăng bởi: <Text style={{ fontWeight: "600" }}>{ownerLabel}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        {formatBytes(item.fileSizeBytes)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Filter ActionSheets */}
      <ActionSheet
        visible={activeSheet === "curriculum"}
        title="Chọn chương trình học"
        actions={curriculumActions}
        onDismiss={() => setActiveSheet(null)}
      />
      <ActionSheet
        visible={activeSheet === "semester"}
        title="Chọn kỳ học"
        actions={semesterActions}
        onDismiss={() => setActiveSheet(null)}
      />
      <ActionSheet
        visible={activeSheet === "subject"}
        title="Chọn môn học"
        actions={subjectActions}
        onDismiss={() => setActiveSheet(null)}
      />
    </SafeAreaView>
  );
}
