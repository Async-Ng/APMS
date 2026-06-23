import { useRouter } from "expo-router";
import { FlatList, RefreshControl, SafeAreaView, View } from "react-native";

import { FileItem } from "../../../components/app/FileItem";
import { FolderItem } from "../../../components/app/FolderItem";
import { ActionSheet, type ActionItem } from "../../../components/app/ActionSheet";
import { EmptyState } from "../../../components/ui/EmptyState";
import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SectionHeaderRow } from "../../../components/ui/SectionHeaderRow";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { useStarred, type DriveFolder, type DriveDocument } from "../../../hooks/useDrive";
import { useToggleFolderStar } from "../../../hooks/useFolders";
import { useToggleDocumentStar } from "../../../hooks/useDocuments";
import { useState } from "react";

type ActionTarget =
  | { kind: "folder"; item: DriveFolder }
  | { kind: "document"; item: DriveDocument }
  | null;

export default function StarredScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useStarred();
  const toggleFolderStar = useToggleFolderStar();
  const toggleDocumentStar = useToggleDocumentStar();
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);

  const folders = data?.folders ?? [];
  const documents = data?.documents ?? [];
  const isEmpty = !isLoading && folders.length === 0 && documents.length === 0;

  function buildActions(target: ActionTarget): ActionItem[] {
    if (!target) return [];
    if (target.kind === "folder") {
      return [
        {
          label: "Bỏ gắn sao",
          icon: "star",
          onPress: () => toggleFolderStar.mutate({ id: target.item.id, star: false }),
        },
        {
          label: "Mở thư mục",
          icon: "folder-open-outline",
          onPress: () => router.push(`/(tabs)/drive/${target.item.id}`),
        },
      ];
    }
    return [
      {
        label: "Bỏ gắn sao",
        icon: "star",
        onPress: () => toggleDocumentStar.mutate({ id: target.item.id, star: false }),
      },
      {
        label: "Mở tài liệu",
        icon: "document-outline",
        onPress: () => router.push(`/documents/${target.item.id}`),
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
      <HeaderBar title="Đã gắn sao" onBack={() => router.back()} />

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
                icon="star-outline"
                title="Chưa có mục gắn sao"
                description="Gắn sao thư mục và tệp để truy cập nhanh tại đây."
              />
            );
          }}
        />
      )}

      <ActionSheet
        visible={actionTarget !== null}
        title={actionTarget?.kind === "folder" ? actionTarget.item.name : (actionTarget?.kind === "document" ? actionTarget.item.title : "")}
        actions={buildActions(actionTarget)}
        onDismiss={() => setActionTarget(null)}
      />
    </SafeAreaView>
  );
}
