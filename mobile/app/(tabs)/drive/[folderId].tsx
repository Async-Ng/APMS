import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, SafeAreaView, View } from "react-native";

import { ActionSheet } from "../../../components/app/ActionSheet";
import { BreadcrumbNav, type BreadcrumbItem } from "../../../components/app/BreadcrumbNav";
import { FileItem } from "../../../components/app/FileItem";
import { FolderItem } from "../../../components/app/FolderItem";
import { FolderModal } from "../../../components/app/FolderModal";
import { ShareSheet } from "../../../components/app/ShareSheet";
import { UploadSheet } from "../../../components/app/UploadSheet";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Fab } from "../../../components/ui/Fab";
import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SectionHeaderRow } from "../../../components/ui/SectionHeaderRow";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { useDrive, type DriveDocument, type DriveFolder } from "../../../hooks/useDrive";
import { useFolder, useCreateFolder } from "../../../hooks/useFolders";
import { useDriveItemActions, type ShareTarget } from "../../../hooks/useDriveItemActions";

type ActionTarget =
  | { kind: "folder"; item: DriveFolder }
  | { kind: "document"; item: DriveDocument }
  | null;

export default function FolderScreen() {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const router = useRouter();

  const folderQuery = useFolder(folderId);
  const { data, isLoading, refetch, isRefetching } = useDrive(folderId);

  const createFolder = useCreateFolder();

  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  const { buildFolderActions, buildDocumentActions } = useDriveItemActions(setShareTarget);

  const folderName = folderQuery.data?.name ?? "Thư mục";
  const folders = data?.folders ?? [];
  const documents = data?.documents ?? [];
  const isEmpty = !isLoading && folders.length === 0 && documents.length === 0;

  const breadcrumbs: BreadcrumbItem[] = [
    { id: null, name: "Drive của tôi" },
    { id: folderId, name: folderName },
  ];

  function handleBreadcrumbNavigate(id: string | null) {
    if (id === null) router.push("/(tabs)/drive");
  }

  type ListItem =
    | { type: "header"; key: string; label: string; count: number }
    | { type: "folder"; key: string; item: DriveFolder }
    | { type: "document"; key: string; item: DriveDocument }
    | { type: "empty"; key: string };

  const listData: ListItem[] = [
    ...(folders.length > 0
      ? [
          { type: "header" as const, key: "hdr-folders", label: "Thư mục", count: folders.length },
          ...folders.map((f) => ({ type: "folder" as const, key: `f-${f.id}`, item: f })),
        ]
      : []),
    ...(documents.length > 0
      ? [
          { type: "header" as const, key: "hdr-docs", label: "Tệp", count: documents.length },
          ...documents.map((d) => ({ type: "document" as const, key: `d-${d.id}`, item: d })),
        ]
      : []),
    ...(isEmpty ? [{ type: "empty" as const, key: "empty" }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar
        title={folderName}
        onBack={() => router.back()}
        below={<BreadcrumbNav items={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />}
      />

      {/* Content */}
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
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.fptBlue} />
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
                  isStarred={item.item.isStarred}
                  onPress={() => router.push(`/documents/${item.item.id}`)}
                  onLongPress={() => setActionTarget({ kind: "document", item: item.item })}
                />
              );
            }
            return (
              <EmptyState
                icon="folder-open-outline"
                title="Thư mục trống"
                description="Tải lên tệp hoặc tạo thư mục con tại đây."
                action={{ label: "Tải lên tệp", onPress: () => setShowUpload(true) }}
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

      <UploadSheet visible={showUpload} folderId={folderId} onDismiss={() => setShowUpload(false)} />
      <FolderModal
        visible={showNewFolder}
        onDismiss={() => setShowNewFolder(false)}
        loading={createFolder.isPending}
        onConfirm={(name, color) => {
          createFolder.mutate({ name, parentId: folderId, color }, { onSuccess: () => setShowNewFolder(false) });
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
    </SafeAreaView>
  );
}
