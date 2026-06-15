import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, SafeAreaView, Text, View } from "react-native";

import { ActionSheet, type ActionItem } from "../../../components/app/ActionSheet";
import { FileItem } from "../../../components/app/FileItem";
import { FolderItem } from "../../../components/app/FolderItem";
import { FolderModal } from "../../../components/app/FolderModal";
import { ShareSheet } from "../../../components/app/ShareSheet";
import { UploadSheet } from "../../../components/app/UploadSheet";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { pressedBrutalStyle, brutalCtaStyle } from "../../../lib/brutal-style";
import { useDrive, type DriveDocument, type DriveFolder } from "../../../hooks/useDrive";
import { useCreateFolder, useDeleteFolder, useToggleFolderStar } from "../../../hooks/useFolders";
import { useDeleteDocument, useToggleDocumentStar } from "../../../hooks/useDocuments";

type ActionTarget =
  | { kind: "folder"; item: DriveFolder }
  | { kind: "document"; item: DriveDocument }
  | null;

export default function DriveRoot() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useDrive(null);

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

  const folders = data?.folders ?? [];
  const documents = data?.documents ?? [];
  const isEmpty = !isLoading && folders.length === 0 && documents.length === 0;

  function buildFolderActions(folder: DriveFolder): ActionItem[] {
    return [
      {
        label: folder.isStarred ? "Bỏ gắn sao" : "Gắn sao",
        icon: folder.isStarred ? "star" : "star-outline",
        onPress: () => toggleFolderStar.mutate({ id: folder.id, star: !folder.isStarred }),
      },
      {
        label: "Chia sẻ",
        icon: "share-outline",
        onPress: () => setShareTarget({ type: "folder", id: folder.id, name: folder.name }),
      },
      {
        label: "Xóa",
        icon: "trash-outline",
        destructive: true,
        onPress: () => deleteFolder.mutate(folder.id),
      },
    ];
  }

  function buildDocumentActions(doc: DriveDocument): ActionItem[] {
    return [
      {
        label: doc.isStarred ? "Bỏ gắn sao" : "Gắn sao",
        icon: doc.isStarred ? "star" : "star-outline",
        onPress: () => toggleDocumentStar.mutate({ id: doc.id, star: !doc.isStarred }),
      },
      {
        label: "Chia sẻ",
        icon: "share-outline",
        onPress: () => setShareTarget({ type: "document", id: doc.id, name: doc.title }),
      },
      {
        label: "Trò chuyện về tài liệu này",
        icon: "chatbubble-outline",
        onPress: () => router.push({ pathname: "/(tabs)/chat", params: { contextType: "document", contextId: doc.id, contextName: doc.title } }),
      },
      {
        label: "Xóa",
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
          { type: "header" as const, key: "header-folders", label: "Thư mục", count: folders.length },
          ...folders.map((f) => ({ type: "folder" as const, key: `f-${f.id}`, item: f })),
        ]
      : []),
    ...(documents.length > 0
      ? [
          { type: "header" as const, key: "header-docs", label: "Tệp", count: documents.length },
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
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 3,
          borderBottomColor: colors.ink,
          backgroundColor: colors.surface,
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink }}>Drive của tôi</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {folders.length} thư mục · {documents.length} tệp
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => router.push("/(tabs)/drive/starred")}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: colors.ink,
              backgroundColor: pressed ? "#F0F0F0" : colors.surface,
              alignItems: "center",
              justifyContent: "center",
            })}
            accessibilityLabel="Đã gắn sao"
          >
            <Ionicons name="star-outline" size={20} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/drive/trash")}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: colors.ink,
              backgroundColor: pressed ? "#F0F0F0" : colors.surface,
              alignItems: "center",
              justifyContent: "center",
            })}
            accessibilityLabel="Thùng rác"
          >
            <Ionicons name="trash-outline" size={20} color={colors.ink} />
          </Pressable>
        </View>
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
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.fptBlue}
            />
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted, letterSpacing: 0.5 }}>
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
                title="Drive trống"
                description="Tải lên tài liệu đầu tiên hoặc tạo thư mục để bắt đầu."
                action={{ label: "Tải lên tệp", onPress: () => setShowUpload(true) }}
              />
            );
          }}
        />
      )}

      {/* FAB */}
      {showFab && (
        <Pressable
          style={{ position: "absolute", inset: 0 }}
          onPress={() => setShowFab(false)}
        />
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
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.onBrand }}>Thư mục mới</Text>
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
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.onBrand }}>Tải lên tệp</Text>
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
        accessibilityLabel="Thêm mục"
        accessibilityRole="button"
      >
        <Ionicons name={showFab ? "close" : "add"} size={28} color={colors.onBrand} />
      </Pressable>

      {/* Modals */}
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
    </SafeAreaView>
  );
}
