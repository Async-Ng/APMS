import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, SafeAreaView, Text, View } from "react-native";

import { ActionSheet, type ActionItem } from "../../../components/app/ActionSheet";
import { BreadcrumbNav, type BreadcrumbItem } from "../../../components/app/BreadcrumbNav";
import { FileItem } from "../../../components/app/FileItem";
import { FolderItem } from "../../../components/app/FolderItem";
import { FolderModal } from "../../../components/app/FolderModal";
import { ShareSheet } from "../../../components/app/ShareSheet";
import { UploadSheet } from "../../../components/app/UploadSheet";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { brutalCtaStyle, pressedBrutalStyle } from "../../../lib/brutal-style";
import { useDrive, type DriveDocument, type DriveFolder } from "../../../hooks/useDrive";
import { useFolder, useCreateFolder, useDeleteFolder, useToggleFolderStar } from "../../../hooks/useFolders";
import { useDeleteDocument, useToggleDocumentStar } from "../../../hooks/useDocuments";

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
  const deleteFolder = useDeleteFolder();
  const toggleFolderStar = useToggleFolderStar();
  const deleteDocument = useDeleteDocument();
  const toggleDocumentStar = useToggleDocumentStar();

  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);
  const [shareTarget, setShareTarget] = useState<{ type: "folder" | "document"; id: string; name: string } | null>(null);

  const folderName = folderQuery.data?.name ?? "Folder";
  const folders = data?.folders ?? [];
  const documents = data?.documents ?? [];
  const isEmpty = !isLoading && folders.length === 0 && documents.length === 0;

  const breadcrumbs: BreadcrumbItem[] = [
    { id: null, name: "Drive" },
    { id: folderId, name: folderName },
  ];

  function handleBreadcrumbNavigate(id: string | null) {
    if (id === null) router.push("/(tabs)/drive");
  }

  function buildFolderActions(folder: DriveFolder): ActionItem[] {
    return [
      {
        label: folder.isStarred ? "Unstar" : "Star",
        icon: folder.isStarred ? "star" : "star-outline",
        onPress: () => toggleFolderStar.mutate({ id: folder.id, star: !folder.isStarred }),
      },
      {
        label: "Share",
        icon: "share-outline",
        onPress: () => setShareTarget({ type: "folder", id: folder.id, name: folder.name }),
      },
      {
        label: "Delete",
        icon: "trash-outline",
        destructive: true,
        onPress: () => deleteFolder.mutate(folder.id),
      },
    ];
  }

  function buildDocumentActions(doc: DriveDocument): ActionItem[] {
    return [
      {
        label: doc.isStarred ? "Unstar" : "Star",
        icon: doc.isStarred ? "star" : "star-outline",
        onPress: () => toggleDocumentStar.mutate({ id: doc.id, star: !doc.isStarred }),
      },
      {
        label: "Share",
        icon: "share-outline",
        onPress: () => setShareTarget({ type: "document", id: doc.id, name: doc.title }),
      },
      {
        label: "Chat about this",
        icon: "chatbubble-outline",
        onPress: () =>
          router.push({
            pathname: "/(tabs)/chat",
            params: { contextType: "document", contextId: doc.id, contextName: doc.title },
          }),
      },
      {
        label: "Delete",
        icon: "trash-outline",
        destructive: true,
        onPress: () => deleteDocument.mutate(doc.id),
      },
    ];
  }

  type ListItem =
    | { type: "header"; key: string; label: string; count: number }
    | { type: "folder"; key: string; item: DriveFolder }
    | { type: "document"; key: string; item: DriveDocument }
    | { type: "empty"; key: string };

  const listData: ListItem[] = [
    ...(folders.length > 0
      ? [
          { type: "header" as const, key: "hdr-folders", label: "Folders", count: folders.length },
          ...folders.map((f) => ({ type: "folder" as const, key: `f-${f.id}`, item: f })),
        ]
      : []),
    ...(documents.length > 0
      ? [
          { type: "header" as const, key: "hdr-docs", label: "Files", count: documents.length },
          ...documents.map((d) => ({ type: "document" as const, key: `d-${d.id}`, item: d })),
        ]
      : []),
    ...(isEmpty ? [{ type: "empty" as const, key: "empty" }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          borderBottomWidth: 3,
          borderBottomColor: colors.ink,
          backgroundColor: colors.surface,
          paddingTop: 8,
          paddingBottom: 0,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, gap: 10 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: colors.ink,
              backgroundColor: pressed ? "#F0F0F0" : colors.surface,
              alignItems: "center",
              justifyContent: "center",
            })}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, flex: 1 }} numberOfLines={1}>
            {folderName}
          </Text>
        </View>
        <BreadcrumbNav items={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />
        <View style={{ height: 10 }} />
      </View>

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
              return (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted }}>
                    {item.label.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{item.count}</Text>
                </View>
              );
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
                title="Folder is empty"
                description="Upload files or create subfolders here."
                action={{ label: "Upload file", onPress: () => setShowUpload(true) }}
              />
            );
          }}
        />
      )}

      {/* FAB */}
      {showFab && (
        <Pressable style={{ position: "absolute", inset: 0 }} onPress={() => setShowFab(false)} />
      )}
      {showFab && (
        <View style={{ position: "absolute", bottom: 90, right: 20, gap: 12, alignItems: "flex-end" }}>
          <Pressable
            onPress={() => { setShowFab(false); setShowNewFolder(true); }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: colors.fptBlue,
              borderWidth: 3,
              borderColor: colors.ink,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 12,
              shadowColor: colors.ink,
              shadowOffset: pressed ? { width: 0, height: 0 } : { width: 4, height: 4 },
              shadowOpacity: pressed ? 0 : 1,
              shadowRadius: 0,
              elevation: pressed ? 0 : 4,
              transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : [],
            })}
          >
            <Ionicons name="folder-open-outline" size={18} color={colors.onBrand} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.onBrand }}>New folder</Text>
          </Pressable>
          <Pressable
            onPress={() => { setShowFab(false); setShowUpload(true); }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: colors.fptOrange,
              borderWidth: 3,
              borderColor: colors.ink,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 12,
              shadowColor: colors.ink,
              shadowOffset: pressed ? { width: 0, height: 0 } : { width: 4, height: 4 },
              shadowOpacity: pressed ? 0 : 1,
              shadowRadius: 0,
              elevation: pressed ? 0 : 4,
              transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : [],
            })}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={colors.onBrand} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.onBrand }}>Upload file</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={() => setShowFab((v) => !v)}
        style={({ pressed }) => ({
          ...brutalCtaStyle,
          position: "absolute",
          bottom: 90,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: showFab ? colors.ink : colors.fptOrange,
          ...pressedBrutalStyle(pressed),
        })}
        accessibilityLabel="Add item"
      >
        <Ionicons name={showFab ? "close" : "add"} size={28} color={colors.onBrand} />
      </Pressable>

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
        subtitle={actionTarget?.kind === "folder" ? "Folder" : "Document"}
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
