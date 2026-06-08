import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, SafeAreaView, Text, View } from "react-native";

import { ActionSheet, type ActionItem } from "../../../components/app/ActionSheet";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { type DriveDocument, type DriveFolder, useTrash } from "../../../hooks/useDrive";
import { useDeleteDocument, useRestoreDocument } from "../../../hooks/useDocuments";
import { useDeleteFolder, useRestoreFolder } from "../../../hooks/useFolders";

type ActionTarget =
  | { kind: "folder"; item: DriveFolder }
  | { kind: "document"; item: DriveDocument }
  | null;

export default function TrashScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useTrash();
  const restoreFolder = useRestoreFolder();
  const deleteFolder = useDeleteFolder();
  const restoreDocument = useRestoreDocument();
  const deleteDocument = useDeleteDocument();
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);

  const folders = data?.folders ?? [];
  const documents = data?.documents ?? [];
  const isEmpty = !isLoading && folders.length === 0 && documents.length === 0;

  function buildActions(target: ActionTarget): ActionItem[] {
    if (!target) return [];
    if (target.kind === "folder") {
      return [
        {
          label: "Restore",
          icon: "refresh-outline",
          onPress: () => restoreFolder.mutate(target.item.id),
        },
        {
          label: "Delete permanently",
          icon: "trash-outline",
          destructive: true,
          onPress: () => deleteFolder.mutate(target.item.id),
        },
      ];
    }
    return [
      {
        label: "Restore",
        icon: "refresh-outline",
        onPress: () => restoreDocument.mutate(target.item.id),
      },
      {
        label: "Delete permanently",
        icon: "trash-outline",
        destructive: true,
        onPress: () => deleteDocument.mutate(target.item.id),
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
          { type: "header" as const, key: "hdr-f", label: "Folders", count: folders.length },
          ...folders.map((f) => ({ type: "folder" as const, key: `f-${f.id}`, item: f })),
        ]
      : []),
    ...(documents.length > 0
      ? [
          { type: "header" as const, key: "hdr-d", label: "Files", count: documents.length },
          ...documents.map((d) => ({ type: "document" as const, key: `d-${d.id}`, item: d })),
        ]
      : []),
    ...(isEmpty ? [{ type: "empty" as const, key: "empty" }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 3,
          borderBottomColor: colors.ink,
          backgroundColor: colors.surface,
        }}
      >
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
        >
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink }}>Trash</Text>
      </View>

      {!isEmpty && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#FEF3C7", borderBottomWidth: 2, borderBottomColor: colors.ink }}>
          <Text style={{ fontSize: 12, color: "#92400E", fontWeight: "600" }}>
            Long-press any item to restore or permanently delete it.
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={3} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.fptBlue} />
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted }}>{item.label.toUpperCase()}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{item.count}</Text>
                </View>
              );
            }
            if (item.type === "folder") {
              return (
                <Pressable
                  onLongPress={() => setActionTarget({ kind: "folder", item: item.item })}
                  delayLongPress={400}
                  style={{ opacity: 0.7 }}
                >
                  <FolderItem
                    name={item.item.name}
                    accentColor={item.item.color}
                    onPress={() => setActionTarget({ kind: "folder", item: item.item })}
                    onLongPress={() => setActionTarget({ kind: "folder", item: item.item })}
                  />
                </Pressable>
              );
            }
            if (item.type === "document") {
              return (
                <View style={{ opacity: 0.7 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: colors.surface,
                      borderWidth: 3,
                      borderColor: colors.ink,
                      borderRadius: 14,
                      padding: 14,
                      shadowColor: colors.ink,
                      shadowOffset: { width: 4, height: 4 },
                      shadowOpacity: 1,
                      shadowRadius: 0,
                      elevation: 4,
                    }}
                  >
                    <Ionicons name="document-outline" size={22} color={colors.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.muted }} numberOfLines={1}>
                        {item.item.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>Deleted</Text>
                    </View>
                    <Pressable
                      onPress={() => setActionTarget({ kind: "document", item: item.item })}
                      style={({ pressed }) => ({
                        padding: 8,
                        backgroundColor: pressed ? "#F0F0F0" : "transparent",
                        borderRadius: 8,
                      })}
                    >
                      <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
                    </Pressable>
                  </View>
                </View>
              );
            }
            return (
              <EmptyState
                icon="trash-outline"
                title="Trash is empty"
                description="Deleted files and folders will appear here."
              />
            );
          }}
        />
      )}

      <ActionSheet
        visible={actionTarget !== null}
        title={actionTarget?.kind === "folder" ? actionTarget.item.name : (actionTarget?.kind === "document" ? actionTarget.item.title : "")}
        subtitle="In Trash"
        actions={buildActions(actionTarget)}
        onDismiss={() => setActionTarget(null)}
      />
    </SafeAreaView>
  );
}
