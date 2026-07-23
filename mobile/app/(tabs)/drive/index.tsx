import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from "react-native";

import { ActionSheet } from "../../../components/app/ActionSheet";
import { FileItem } from "../../../components/app/FileItem";
import { FolderItem } from "../../../components/app/FolderItem";
import { FolderModal } from "../../../components/app/FolderModal";
import { FolderPickerModal } from "../../../components/app/FolderPickerModal";
import { ShareSheet } from "../../../components/app/ShareSheet";
import { TagEditModal } from "../../../components/app/TagEditModal";
import { UploadSheet } from "../../../components/app/UploadSheet";
import { BrutalButton } from "../../../components/ui/BrutalButton";
import { BrutalCard } from "../../../components/ui/BrutalCard";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Fab } from "../../../components/ui/Fab";
import { HeaderBar, HeaderIconButton } from "../../../components/ui/HeaderBar";
import { SectionHeaderRow } from "../../../components/ui/SectionHeaderRow";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { type CatalogCourseSlot, useEnrolledCourses } from "../../../hooks/useCatalog";
import { useDrive, type DriveDocument, type DriveFolder } from "../../../hooks/useDrive";
import { useUpdateDocument } from "../../../hooks/useDocuments";
import { useCreateFolder, useUpdateFolder } from "../../../hooks/useFolders";
import {
  useDriveItemActions,
  type MoveTarget,
  type ShareTarget,
} from "../../../hooks/useDriveItemActions";
import { getErrorMessage } from "../../../lib/api-error";

type ActionTarget =
  | { kind: "folder"; item: DriveFolder }
  | { kind: "document"; item: DriveDocument }
  | null;

function formatCourseLabel(course?: CatalogCourseSlot | null): string | null {
  if (!course?.subject) return null;
  const semester = course.semester?.code ? `${course.semester.code} · ` : "";
  return `${semester}${course.subject.code} - ${course.subject.name}`;
}

function formatCourseSubtitle(course?: CatalogCourseSlot | null): string | null {
  if (!course?.subject) return null;
  const semester = course.semester?.code ? `${course.semester.code} · ` : "";
  return `${semester}${course.subject.code} · ${course.subject.name}`;
}

function getDocumentCourseLabel(document: DriveDocument): string | null {
  const slot = document.courseSlot;
  if (!slot?.subject) return null;
  const semester = slot.semester?.code ? `${slot.semester.code} · ` : "";
  return `${semester}${slot.subject.code}`;
}

function getSemesterKey(course: CatalogCourseSlot): string {
  return course.semester?.id ?? course.semester?.code ?? "unknown";
}

function getSemesterLabel(course: CatalogCourseSlot): string {
  return course.semester?.code ?? "Chưa rõ kỳ";
}

function groupCoursesBySemester(courses: CatalogCourseSlot[]) {
  const groups = new Map<string, { key: string; label: string; courses: CatalogCourseSlot[] }>();
  for (const course of courses) {
    const key = getSemesterKey(course);
    const existing = groups.get(key);
    if (existing) {
      existing.courses.push(course);
    } else {
      groups.set(key, { key, label: getSemesterLabel(course), courses: [course] });
    }
  }
  return Array.from(groups.values());
}

export default function DriveRoot() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useDrive(null);
  const { profile, enrolledCourses, isLoading: profileLoading } = useEnrolledCourses();

  const createFolder = useCreateFolder();
  const updateDocument = useUpdateDocument();
  const updateFolder = useUpdateFolder();

  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [tagTarget, setTagTarget] = useState<DriveDocument | null>(null);
  const [selectedCourseSlotId, setSelectedCourseSlotId] = useState<string | null>(null);
  const [selectedSemesterKey, setSelectedSemesterKey] = useState<string | null>(null);

  const { buildFolderActions, buildDocumentActions } = useDriveItemActions(
    setShareTarget,
    setMoveTarget,
    setTagTarget,
  );

  function handleMoveConfirm(targetFolderId: string | null) {
    if (!moveTarget) return;
    setMoveError(null);
    const onSuccess = () => {
      setMoveTarget(null);
    };
    const onError = (err: unknown) => {
      setMoveError(getErrorMessage(err, "Di chuyển thất bại. Vui lòng thử lại."));
    };
    if (moveTarget.type === "document") {
      updateDocument.mutate(
        { id: moveTarget.id, folderId: targetFolderId },
        { onSuccess, onError },
      );
    } else {
      updateFolder.mutate(
        { id: moveTarget.id, parentId: targetFolderId },
        { onSuccess, onError },
      );
    }
  }

  const folders = data?.folders ?? [];
  const documents = data?.documents ?? [];
  const selectedCourse = enrolledCourses.find((course) => course.id === selectedCourseSlotId) ?? null;
  const semesterGroups = groupCoursesBySemester(enrolledCourses);
  const activeSemesterKey =
    selectedCourse ? getSemesterKey(selectedCourse) : selectedSemesterKey ?? semesterGroups[0]?.key ?? null;
  const visibleCourseGroup = semesterGroups.find((group) => group.key === activeSemesterKey) ?? semesterGroups[0];
  const visibleFolders = selectedCourseSlotId ? [] : folders;
  const visibleDocuments = selectedCourseSlotId
    ? documents.filter((document) => document.courseSlot?.id === selectedCourseSlotId)
    : documents;
  const isEmpty = !isLoading && visibleFolders.length === 0 && visibleDocuments.length === 0;

  const courseDocumentCounts = new Map<string, number>();
  for (const document of documents) {
    const courseId = document.courseSlot?.id;
    if (!courseId) continue;
    courseDocumentCounts.set(courseId, (courseDocumentCounts.get(courseId) ?? 0) + 1);
  }

  type ListItem =
    | { type: "header"; key: string; label: string; count: number }
    | { type: "folder"; key: string; item: DriveFolder }
    | { type: "document"; key: string; item: DriveDocument }
    | { type: "empty"; key: string };

  const listData: ListItem[] = [
    ...(visibleFolders.length > 0
      ? [
          { type: "header" as const, key: "header-folders", label: "Thư mục", count: visibleFolders.length },
          ...visibleFolders.map((f) => ({ type: "folder" as const, key: `f-${f.id}`, item: f })),
        ]
      : []),
    ...(visibleDocuments.length > 0
      ? [
          {
            type: "header" as const,
            key: "header-docs",
            label: selectedCourse ? "Tài liệu trong môn" : "Tệp",
            count: visibleDocuments.length,
          },
          ...visibleDocuments.map((d) => ({ type: "document" as const, key: `d-${d.id}`, item: d })),
        ]
      : []),
    ...(isEmpty ? [{ type: "empty" as const, key: "empty" }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar
        title="Drive của tôi"
        subtitle={
          selectedCourse
            ? formatCourseSubtitle(selectedCourse) ?? `${visibleDocuments.length} tệp`
            : `${folders.length} thư mục · ${documents.length} tệp`
        }
        right={
          <View style={{ flexDirection: "row", gap: 6 }}>
            <HeaderIconButton
              icon="people-outline"
              size={40}
              accessibilityLabel="Đã chia sẻ"
              onPress={() => router.push("/(tabs)/drive/shared")}
            />
            <HeaderIconButton
              icon="star-outline"
              size={40}
              accessibilityLabel="Đã gắn sao"
              onPress={() => router.push("/(tabs)/drive/starred")}
            />
            <HeaderIconButton
              icon="trash-outline"
              size={40}
              accessibilityLabel="Thùng rác"
              onPress={() => router.push("/(tabs)/drive/trash")}
            />
          </View>
        }
      />

      <View style={{ paddingTop: 16, gap: 14 }}>
        {!profileLoading && profile && !profile.isComplete && (
          <View style={{ paddingHorizontal: 16 }}>
            <BrutalCard accentColor="#FFE600" padding={16}>
              <Text style={{ fontWeight: "800", fontSize: 16, color: colors.ink, marginBottom: 8 }}>
                Chưa có chương trình học
              </Text>
              <Text style={{ fontSize: 14, color: colors.ink, marginBottom: 12, fontWeight: "500" }}>
                Chọn CTĐT để APMS sắp xếp tài liệu theo đúng môn học khi tải lên và tìm kiếm.
              </Text>
              <BrutalButton
                label="Thiết lập ngay"
                onPress={() => router.push("/profile/academic")}
                variant="secondary"
                size="sm"
                style={{ alignSelf: "flex-start" }}
              />
            </BrutalCard>
          </View>
        )}

        {!profileLoading && profile?.isComplete && enrolledCourses.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={{ paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted }}>
                  MÔN TRONG CTĐT
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
                  {profile.curriculum?.code ?? "CTĐT"} · chọn môn để lọc tài liệu
                </Text>
              </View>
              {selectedCourseSlotId && (
                <Pressable
                  onPress={() => setSelectedCourseSlotId(null)}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: colors.ink,
                    backgroundColor: pressed ? "#F0F0F0" : colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                  accessibilityRole="button"
                  accessibilityLabel="Bỏ lọc môn học"
                >
                  <Text style={{ fontSize: 12, fontWeight: "800", color: colors.ink }}>Tất cả</Text>
                </Pressable>
              )}
            </View>

            {semesterGroups.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 2 }}
              >
                {semesterGroups.map((group) => {
                  const active = group.key === activeSemesterKey;
                  return (
                    <Pressable
                      key={group.key}
                      onPress={() => {
                        setSelectedSemesterKey(group.key);
                        setSelectedCourseSlotId(null);
                      }}
                      style={({ pressed }) => ({
                        minHeight: 40,
                        borderWidth: 2,
                        borderColor: colors.ink,
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        backgroundColor: active ? colors.fptBlue : pressed ? "#F0F0F0" : colors.surface,
                        alignItems: "center",
                        justifyContent: "center",
                      })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Xem môn ${group.label}`}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "800",
                          color: active ? colors.onBrand : colors.ink,
                        }}
                      >
                        {group.label} · {group.courses.length}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {visibleCourseGroup && (
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.fptBlue }}>
                  {visibleCourseGroup.label}
                </Text>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 4 }}
            >
              {(visibleCourseGroup?.courses ?? enrolledCourses).map((course) => {
                const selected = selectedCourseSlotId === course.id;
                const count = courseDocumentCounts.get(course.id) ?? 0;
                const label = formatCourseLabel(course) ?? "Môn học";

                return (
                  <Pressable
                    key={course.id}
                    onPress={() => {
                      setSelectedSemesterKey(getSemesterKey(course));
                      setSelectedCourseSlotId(selected ? null : course.id);
                    }}
                    style={({ pressed }) => ({
                      width: 204,
                      minHeight: 96,
                      borderWidth: 3,
                      borderColor: colors.ink,
                      borderRadius: 14,
                      padding: 12,
                      gap: 6,
                      backgroundColor: selected ? colors.fptOrange : colors.surface,
                      shadowColor: colors.ink,
                      shadowOffset: pressed ? { width: 0, height: 0 } : { width: 3, height: 3 },
                      shadowOpacity: pressed ? 0 : 1,
                      shadowRadius: 0,
                      elevation: pressed ? 0 : 3,
                      transform: pressed ? [{ translateX: 3 }, { translateY: 3 }] : [],
                    })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Lọc tài liệu môn ${label}`}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: selected ? colors.onBrand : colors.fptBlue,
                      }}
                      numberOfLines={1}
                    >
                      {course.semester?.code ?? "Học kỳ"} · {course.subject?.code ?? "Môn học"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 18,
                        fontWeight: "800",
                        color: selected ? colors.onBrand : colors.ink,
                      }}
                      numberOfLines={2}
                    >
                      {course.subject?.name ?? "Môn học"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: selected ? "rgba(255,255,255,0.88)" : colors.muted,
                      }}
                    >
                      {count} tài liệu
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={4} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.fptBlue}
            />
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <SectionHeaderRow label={item.label} count={item.count} />;
            }
            if (item.type === "folder") {
              return (
                <FolderItem
                  name={item.item.name}
                  isStarred={item.item.isStarred}
                  accentColor={item.item.color}
                  onPress={() => router.push(`/(tabs)/drive/${item.item.id}`)}
                  onLongPress={() => setActionTarget({ kind: "folder", item: item.item })}
                />
              );
            }
            if (item.type === "document") {
              return (
                <FileItem
                  title={item.item.title}
                  mimeType={item.item.mimeType}
                  fileSizeBytes={item.item.fileSizeBytes}
                  status={item.item.status}
                  createdAt={item.item.createdAt}
                  isStarred={item.item.isStarred}
                  courseLabel={getDocumentCourseLabel(item.item)}
                  onPress={() => router.push(`/documents/${item.item.id}`)}
                  onLongPress={() => setActionTarget({ kind: "document", item: item.item })}
                />
              );
            }
            return (
              <EmptyState
                icon="folder-open-outline"
                title={selectedCourse ? "Chưa có tài liệu cho môn này" : "Drive trống"}
                description={
                  selectedCourse
                    ? "Tải tài liệu lên và chọn đúng môn học để APMS gom vào nhóm này."
                    : "Tải lên tài liệu đầu tiên hoặc tạo thư mục để bắt đầu."
                }
                action={{ label: "Tải lên tài liệu", onPress: () => setShowUpload(true) }}
              />
            );
          }}
        />
      )}

      <Fab
        actions={[
          { label: "Thư mục mới", icon: "folder-open-outline", color: colors.fptBlue, onPress: () => setShowNewFolder(true) },
          { label: "Tải lên tệp", icon: "cloud-upload-outline", color: colors.fptOrange, onPress: () => setShowUpload(true) },
        ]}
      />

      <UploadSheet visible={showUpload} folderId={null} onDismiss={() => setShowUpload(false)} />
      <FolderModal
        visible={showNewFolder}
        onDismiss={() => setShowNewFolder(false)}
        loading={createFolder.isPending}
        onConfirm={(name, color) => {
          createFolder.mutate({ name, parentId: null, color }, { onSuccess: () => setShowNewFolder(false) });
        }}
      />
      <ActionSheet
        visible={actionTarget !== null}
        title={actionTarget?.kind === "folder" ? actionTarget.item.name : (actionTarget?.kind === "document" ? actionTarget.item.title : "")}
        subtitle={actionTarget?.kind === "folder" ? "Thư mục" : "Tài liệu"}
        actions={
          actionTarget?.kind === "folder"
            ? buildFolderActions(actionTarget.item)
            : actionTarget?.kind === "document"
            ? buildDocumentActions(actionTarget.item)
            : []
        }
        onDismiss={() => setActionTarget(null)}
      />
      {shareTarget && (
        <ShareSheet
          visible={shareTarget !== null}
          resourceType={shareTarget.type}
          resourceId={shareTarget.id}
          resourceName={shareTarget.name}
          onDismiss={() => setShareTarget(null)}
        />
      )}
      <TagEditModal
        visible={tagTarget !== null}
        title={tagTarget?.title ?? ""}
        initialTags={tagTarget?.tags ?? []}
        loading={updateDocument.isPending}
        onConfirm={(tags) => {
          if (!tagTarget) return;
          updateDocument.mutate(
            { id: tagTarget.id, tags },
            { onSuccess: () => setTagTarget(null) },
          );
        }}
        onDismiss={() => setTagTarget(null)}
      />
      <FolderPickerModal
        visible={moveTarget !== null}
        title={moveTarget ? `Di chuyển "${moveTarget.name}"` : ""}
        initialFolderId={moveTarget?.parentId ?? null}
        excludeFolderId={moveTarget?.type === "folder" ? moveTarget.id : undefined}
        submitError={moveError}
        loading={updateDocument.isPending || updateFolder.isPending}
        onConfirm={handleMoveConfirm}
        onDismiss={() => {
          setMoveTarget(null);
          setMoveError(null);
        }}
      />
    </SafeAreaView>
  );
}
