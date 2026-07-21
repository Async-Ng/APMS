import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, SafeAreaView, Text, View } from "react-native";

import { ActionSheet, type ActionItem } from "../../components/app/ActionSheet";
import { CatalogFormModal, type CatalogEntityKind, type CatalogFormValues } from "../../components/app/admin/CatalogFormModal";
import { CourseSlotPicker } from "../../components/app/admin/CourseSlotPicker";
import { EmptyState } from "../../components/ui/EmptyState";
import { HeaderBadge, HeaderBar } from "../../components/ui/HeaderBar";
import { SkeletonList } from "../../components/ui/SkeletonCard";
import { colors } from "../../constants/colors";
import { brutalCardStyle, brutalCtaStyle, pressedBrutalStyle } from "../../lib/brutal-style";
import { getErrorMessage } from "../../lib/api-error";
import { useToastStore } from "../../stores/toast-store";
import {
  type CourseSlot,
  type Curriculum,
  type Semester,
  type Subject,
  useAdminCourseSlots,
  useAdminCurricula,
  useAdminSemesters,
  useAdminSubjects,
  useArchiveCourseSlot,
  useArchiveCurriculum,
  useArchiveSemester,
  useArchiveSubject,
  useCreateCourseSlotsBulk,
  useCreateCurriculum,
  useCreateSemester,
  useCreateSubject,
  useUpdateCurriculum,
  useUpdateSemester,
  useUpdateSubject,
} from "../../hooks/useAdminCatalog";

type Tab = "curricula" | "semesters" | "subjects" | "course-slots";

const TABS: { key: Tab; label: string }[] = [
  { key: "curricula", label: "CTĐT" },
  { key: "semesters", label: "Học kỳ" },
  { key: "subjects", label: "Môn học" },
  { key: "course-slots", label: "Gán môn" },
];

export default function AdminCatalogScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("curricula");

  const curricula = useAdminCurricula();
  const semesters = useAdminSemesters();
  const subjects = useAdminSubjects();
  const courseSlots = useAdminCourseSlots();

  const createCurriculum = useCreateCurriculum();
  const updateCurriculum = useUpdateCurriculum();
  const archiveCurriculum = useArchiveCurriculum();
  const createSemester = useCreateSemester();
  const updateSemester = useUpdateSemester();
  const archiveSemester = useArchiveSemester();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const archiveSubject = useArchiveSubject();
  const createCourseSlotsBulk = useCreateCourseSlotsBulk();
  const archiveCourseSlot = useArchiveCourseSlot();

  const [formVisible, setFormVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Curriculum | Semester | Subject | null>(null);
  const [actionTarget, setActionTarget] = useState<{ kind: CatalogEntityKind; item: Curriculum | Semester | Subject } | null>(null);
  const [slotPickerVisible, setSlotPickerVisible] = useState(false);
  const [slotPickerError, setSlotPickerError] = useState<string | null>(null);

  const activeQuery = tab === "curricula" ? curricula : tab === "semesters" ? semesters : tab === "subjects" ? subjects : courseSlots;

  function openCreateForm() {
    setEditTarget(null);
    setFormError(null);
    setFormVisible(true);
  }

  function openEditForm(item: Curriculum | Semester | Subject) {
    setEditTarget(item);
    setFormError(null);
    setFormVisible(true);
    setActionTarget(null);
  }

  function handleFormConfirm(values: CatalogFormValues) {
    setFormError(null);
    const onError = (err: unknown) => setFormError(getErrorMessage(err, "Thao tác thất bại. Vui lòng thử lại."));
    const onSuccess = () => setFormVisible(false);

    if (tab === "curricula") {
      const body = { code: values.code, name: values.name, description: values.description || undefined };
      if (editTarget) updateCurriculum.mutate({ id: editTarget.id, body }, { onSuccess, onError });
      else createCurriculum.mutate(body, { onSuccess, onError });
    } else if (tab === "semesters") {
      const body = {
        code: values.code,
        name: values.name,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : undefined,
      };
      if (editTarget) updateSemester.mutate({ id: editTarget.id, body }, { onSuccess, onError });
      else createSemester.mutate(body, { onSuccess, onError });
    } else if (tab === "subjects") {
      const body = { code: values.code, name: values.name, description: values.description || undefined };
      if (editTarget) updateSubject.mutate({ id: editTarget.id, body }, { onSuccess, onError });
      else createSubject.mutate(body, { onSuccess, onError });
    }
  }

  function confirmArchive(kind: CatalogEntityKind, item: Curriculum | Semester | Subject) {
    setActionTarget(null);
    Alert.alert("Lưu trữ", `Lưu trữ "${item.name}"? Mục này sẽ ẩn khỏi danh sách nhưng vẫn được giữ lại.`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Lưu trữ",
        style: "destructive",
        onPress: () => {
          const onError = (err: unknown) =>
            useToastStore.getState().show(getErrorMessage(err, "Không thể lưu trữ mục này."));
          if (kind === "curriculum") archiveCurriculum.mutate(item.id, { onError });
          if (kind === "semester") archiveSemester.mutate(item.id, { onError });
          if (kind === "subject") archiveSubject.mutate(item.id, { onError });
        },
      },
    ]);
  }

  function handleBulkSlots(values: { curriculumId: string; semesterId: string; subjectIds: string[] }) {
    setSlotPickerError(null);
    createCourseSlotsBulk.mutate(values, {
      onSuccess: (result) => {
        setSlotPickerVisible(false);
        if (result.skipped.length > 0) {
          useToastStore.getState().show(`Đã tạo ${result.created.length}, bỏ qua ${result.skipped.length} môn.`);
        }
      },
      onError: (err) => setSlotPickerError(getErrorMessage(err, "Gán môn thất bại. Vui lòng thử lại.")),
    });
  }

  function confirmArchiveSlot(slot: CourseSlot) {
    Alert.alert("Gỡ môn học", `Gỡ "${slot.subject?.name ?? "môn học"}" khỏi chương trình này?`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Gỡ",
        style: "destructive",
        onPress: () =>
          archiveCourseSlot.mutate(slot.id, {
            onError: (err) => useToastStore.getState().show(getErrorMessage(err, "Không thể gỡ môn học này.")),
          }),
      },
    ]);
  }

  const listData: (Curriculum | Semester | Subject)[] =
    tab === "curricula" ? curricula.data ?? [] : tab === "semesters" ? semesters.data ?? [] : tab === "subjects" ? subjects.data ?? [] : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar title="Danh mục học thuật" onBack={() => router.back()} right={<HeaderBadge label="ADMIN" />} />

      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: colors.ink,
                backgroundColor: active ? colors.fptBlue : colors.surface,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: active ? colors.onBrand : colors.ink }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "course-slots" ? (
        courseSlots.isLoading ? (
          <View style={{ padding: 16 }}>
            <SkeletonList count={4} />
          </View>
        ) : (
          <FlatList
            data={courseSlots.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={courseSlots.isRefetching} onRefresh={() => void courseSlots.refetch()} tintColor={colors.fptBlue} />
            }
            ListEmptyComponent={
              <EmptyState icon="link-outline" title="Chưa có môn học nào được gán" description="Gán môn học vào chương trình và học kỳ để sinh viên có thể chọn." />
            }
            renderItem={({ item }) => (
              <Pressable
                onLongPress={() => confirmArchiveSlot(item)}
                style={{ ...brutalCardStyle, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{item.subject?.name ?? "?"}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    {item.curriculum?.code ?? "?"} · {item.semester?.code ?? "?"}
                  </Text>
                </View>
                <Pressable onPress={() => confirmArchiveSlot(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </Pressable>
              </Pressable>
            )}
          />
        )
      ) : activeQuery.isLoading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={4} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={activeQuery.isRefetching} onRefresh={() => void activeQuery.refetch()} tintColor={colors.fptBlue} />
          }
          ListEmptyComponent={<EmptyState icon="albums-outline" title="Chưa có mục nào" description="Nhấn nút + để thêm mới." />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setActionTarget({ kind: tab === "curricula" ? "curriculum" : tab === "semesters" ? "semester" : "subject", item })}
              style={{ ...brutalCardStyle, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  backgroundColor: item.isActive ? colors.fptGreen : "#E5E5E5",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "800", color: item.isActive ? colors.onBrand : colors.muted }}>{item.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{item.name}</Text>
                {!item.isActive && <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Đã lưu trữ</Text>}
              </View>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
            </Pressable>
          )}
        />
      )}

      {tab !== "course-slots" ? (
        <Pressable
          onPress={openCreateForm}
          style={({ pressed }) => ({
            ...brutalCtaStyle,
            position: "absolute",
            right: 20,
            bottom: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            ...pressedBrutalStyle(pressed),
          })}
          accessibilityLabel="Thêm mới"
        >
          <Ionicons name="add" size={26} color={colors.onBrand} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => {
            setSlotPickerError(null);
            setSlotPickerVisible(true);
          }}
          style={({ pressed }) => ({
            ...brutalCtaStyle,
            position: "absolute",
            right: 20,
            bottom: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            ...pressedBrutalStyle(pressed),
          })}
          accessibilityLabel="Gán môn học"
        >
          <Ionicons name="add" size={26} color={colors.onBrand} />
        </Pressable>
      )}

      <CatalogFormModal
        visible={formVisible}
        kind={tab === "curricula" ? "curriculum" : tab === "semesters" ? "semester" : "subject"}
        initial={
          editTarget
            ? {
                code: editTarget.code,
                name: editTarget.name,
                description: "description" in editTarget ? editTarget.description ?? "" : "",
                sortOrder: "sortOrder" in editTarget ? String(editTarget.sortOrder ?? "") : "",
              }
            : undefined
        }
        loading={createCurriculum.isPending || updateCurriculum.isPending || createSemester.isPending || updateSemester.isPending || createSubject.isPending || updateSubject.isPending}
        submitError={formError}
        onConfirm={handleFormConfirm}
        onDismiss={() => setFormVisible(false)}
      />

      <ActionSheet
        visible={actionTarget !== null}
        title={actionTarget?.item.name ?? ""}
        subtitle={actionTarget?.item.code}
        actions={
          actionTarget
            ? ([
                { label: "Sửa", icon: "create-outline", onPress: () => openEditForm(actionTarget.item) },
                { label: "Lưu trữ", icon: "archive-outline", destructive: true, onPress: () => confirmArchive(actionTarget.kind, actionTarget.item) },
              ] as ActionItem[])
            : []
        }
        onDismiss={() => setActionTarget(null)}
      />

      <CourseSlotPicker
        visible={slotPickerVisible}
        curricula={(curricula.data ?? []).filter((c) => c.isActive)}
        semesters={(semesters.data ?? []).filter((s) => s.isActive)}
        subjects={(subjects.data ?? []).filter((s) => s.isActive)}
        loading={createCourseSlotsBulk.isPending}
        submitError={slotPickerError}
        onConfirm={handleBulkSlots}
        onDismiss={() => setSlotPickerVisible(false)}
      />
    </SafeAreaView>
  );
}
