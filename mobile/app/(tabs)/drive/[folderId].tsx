import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, SafeAreaView, View } from "react-native";

import { ActionSheet } from "../../../components/app/ActionSheet";
import { BreadcrumbNav, type BreadcrumbItem } from "../../../components/app/BreadcrumbNav";
import { FileItem } from "../../../components/app/FileItem";
import { FolderItem } from "../../../components/app/FolderItem";
import { FolderModal } from "../../../components/app/FolderModal";
import { FolderPickerModal } from "../../../components/app/FolderPickerModal";
import { ShareSheet } from "../../../components/app/ShareSheet";
import { TagEditModal } from "../../../components/app/TagEditModal";
import { UploadSheet } from "../../../components/app/UploadSheet";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Fab } from "../../../components/ui/Fab";
import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SectionHeaderRow } from "../../../components/ui/SectionHeaderRow";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { useDrive, useSharedFolderContents, type DriveDocument, type DriveFolder } from "../../../hooks/useDrive";
import { useUpdateDocument } from "../../../hooks/useDocuments";
import { useFolder, useCreateFolder, useUpdateFolder } from "../../../hooks/useFolders";
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

export default function FolderScreen() {
  const { folderId, shared } = useLocalSearchParams<{ folderId: string; shared?: string }>();
  const isShared = shared === "1";
  const router = useRouter();

  const folderQuery = useFolder(folderId);
  const owned = useDrive(folderId);
  const sharedContents = useSharedFolderContents(isShared ? folderId : "");
  const { data, isLoading, refetch, isRefetching } = isShared ? sharedContents : owned;

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

  const folderName = folderQuery.data?.name ?? "Thư mục";
  const folders = data?.folders ?? [];
  const documents = data?.documents ?? [];
  const isEmpty = !isLoading && folders.length === 0 && documents.length === 0;

  const breadcrumbs: BreadcrumbItem[] = [
    { id: null, name: isShared ? "Đã chia sẻ" : "Drive của tôi" },
    { id: folderId, name: folderName },
  ];

  function handleBreadcrumbNavigate(id: string | null) {
    if (id === null) router.push(isShared ? "/(tabs)/drive/shared" : "/(tabs)/drive");
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
                  onPress={() =>
                    router.push(isShared ? `/(tabs)/drive/${item.item.id}?shared=1` : `/(tabs)/drive/${item.item.id}`)
                  }
                  onLongPress={() => !isShared && setActionTarget({ kind: "folder", item: item.item })}
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
                  onPress={() => router.push(`/documents/${item.item.id}`)}
                  onLongPress={() => !isShared && setActionTarget({ kind: "document", item: item.item })}
                />
              );
            }
            return (
              <EmptyState
                icon="folder-open-outline"
                title="Thư mục trống"
                description={isShared ? "Chưa có nội dung trong thư mục này." : "Tải lên tệp hoặc tạo thư mục con tại đây."}
                action={isShared ? undefined : { label: "Tải lên tệp", onPress: () => setShowUpload(true) }}
              />
            );
          }}
        />
      )}

      {!isShared && (
        <Fab
          actions={[
            { label: "Thư mục mới", icon: "folder-open-outline", color: colors.fptBlue, onPress: () => setShowNewFolder(true) },
            { label: "Tải lên tệp", icon: "cloud-upload-outline", color: colors.fptOrange, onPress: () => setShowUpload(true) },
          ]}
        />
      )}

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
