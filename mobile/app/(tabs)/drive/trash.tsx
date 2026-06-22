import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, SafeAreaView, Text, View } from "react-native";

import { ActionSheet, type ActionItem } from "../../../components/app/ActionSheet";
import { FolderItem } from "../../../components/app/FolderItem";
import { EmptyState } from "../../../components/ui/EmptyState";
import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SectionHeaderRow } from "../../../components/ui/SectionHeaderRow";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { type DriveDocument, type DriveFolder, useTrash } from "../../../hooks/useDrive";
import { usePermanentDeleteDocument, useRestoreDocument } from "../../../hooks/useDocuments";
import { usePermanentDeleteFolder, useRestoreFolder } from "../../../hooks/useFolders";

type ActionTarget =
  | { kind: "folder"; item: DriveFolder }
  | { kind: "document"; item: DriveDocument }
  | null;

export default function TrashScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useTrash();
  const restoreFolder = useRestoreFolder();
  const permanentDeleteFolder = usePermanentDeleteFolder();
  const restoreDocument = useRestoreDocument();
  const permanentDeleteDocument = usePermanentDeleteDocument();
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);

  const folders = data?.folders ?? [];
  const documents = data?.documents ?? [];
  const isEmpty = !isLoading && folders.length === 0 && documents.length === 0;

  function buildActions(target: ActionTarget): ActionItem[] {
    if (!target) return [];
    if (target.kind === "folder") {
      return [
        {
          label: "Khôi phục",
          icon: "refresh-outline",
          onPress: () => restoreFolder.mutate(target.item.id),
        },
        {
          label: "Xóa vĩnh viễn",
          icon: "trash-outline",
          destructive: true,
          onPress: () => permanentDeleteFolder.mutate(target.item.id),
        },
      ];
    }
    return [
      {
        label: "Khôi phục",
        icon: "refresh-outline",
        onPress: () => restoreDocument.mutate(target.item.id),
      },
      {
        label: "Xóa vĩnh viễn",
        icon: "trash-outline",
        destructive: true,
        onPress: () => permanentDeleteDocument.mutate(target.item.id),
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
          { type: "header" as const, key: "hdr-f", label: "Thư mục", count: folders.length },
          ...folders.map((f) => ({ type: "folder" as const, key: `f-${f.id}`, item: f })),
        ]
      : []),
    ...(documents.length > 0
      ? [
          { type: "header" as const, key: "hdr-d", label: "Tệp", count: documents.length },
          ...documents.map((d) => ({ type: "document" as const, key: `d-${d.id}`, item: d })),
        ]
      : []),
    ...(isEmpty ? [{ type: "empty" as const, key: "empty" }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar title="Thùng rác" onBack={() => router.back()} />

      {!isEmpty && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#FEF3C7", borderBottomWidth: 2, borderBottomColor: colors.ink }}>
          <Text style={{ fontSize: 12, color: "#92400E", fontWeight: "600" }}>
            Nhấn giữ mục để khôi phục hoặc xóa vĩnh viễn.
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
              return <SectionHeaderRow label={item.label} count={item.count} />;
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
                      <Text style={{ fontSize: 12, color: colors.muted }}>Đã xóa</Text>
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
                title="Thùng rác trống"
                description="Tệp và thư mục đã xóa sẽ xuất hiện tại đây."
              />
            );
          }}
        />
      )}

      <ActionSheet
        visible={actionTarget !== null}
        title={actionTarget?.kind === "folder" ? actionTarget.item.name : (actionTarget?.kind === "document" ? actionTarget.item.title : "")}
        subtitle="Trong Thùng rác"
        actions={buildActions(actionTarget)}
        onDismiss={() => setActionTarget(null)}
      />
    </SafeAreaView>
  );
}
