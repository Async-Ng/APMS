import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { ActionSheet, type ActionItem } from "../../components/app/ActionSheet";
import { DocumentMetaCard, getMimeLabel } from "../../components/app/DocumentMetaCard";
import { ShareSheet } from "../../components/app/ShareSheet";
import { HeaderBar, HeaderIconButton } from "../../components/ui/HeaderBar";
import { SkeletonCard } from "../../components/ui/SkeletonCard";
import { colors } from "../../constants/colors";
import { brutalCtaStyle, pressedBrutalStyle } from "../../lib/brutal-style";
import { useDocument, useDeleteDocument, useToggleDocumentStar, useUpdateDocument } from "../../hooks/useDocuments";
import { useAuthStore } from "../../stores/auth-store";
import { RenameDocumentModal } from "../../components/app/RenameDocumentModal";

export default function DocumentDetailScreen() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const router = useRouter();

  const { data: doc, isLoading } = useDocument(documentId, true);
  const deleteDocument = useDeleteDocument();
  const toggleStar = useToggleDocumentStar();
  const updateDoc = useUpdateDocument();
  const { user } = useAuthStore();

  const [showActions, setShowActions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showRename, setShowRename] = useState(false);

  const isOwner = doc?.ownerId === user?.id;

  function handleOpenExternal() {
    if (doc?.downloadUrl) {
      void Linking.openURL(doc.downloadUrl);
    }
  }

  const actions: ActionItem[] = doc
    ? [
        {
          label: doc.isStarred ? "Bỏ gắn sao" : "Gắn sao",
          icon: (doc.isStarred ? "star" : "star-outline") as keyof typeof Ionicons.glyphMap,
          onPress: () => toggleStar.mutate({ id: doc.id, star: !doc.isStarred }),
        },
        {
          label: "Chia sẻ",
          icon: "share-outline" as keyof typeof Ionicons.glyphMap,
          onPress: () => setShowShare(true),
        },
        ...(isOwner
          ? [
              {
                label: "Đổi tên",
                icon: "create-outline" as keyof typeof Ionicons.glyphMap,
                onPress: () => setShowRename(true),
              },
              {
                label: doc.visibility === "public" ? "Chuyển thành Riêng tư" : "Chuyển thành Công khai",
                icon: (doc.visibility === "public" ? "eye-off-outline" : "eye-outline") as keyof typeof Ionicons.glyphMap,
                onPress: () => {
                  updateDoc.mutate({
                    id: doc.id,
                    visibility: doc.visibility === "public" ? "private" : "public",
                  });
                },
              },
            ]
          : []),
        {
          label: "Trò chuyện về tài liệu này",
          icon: "chatbubble-outline" as keyof typeof Ionicons.glyphMap,
          onPress: () =>
            router.push({
              pathname: "/(tabs)/chat",
              params: { contextType: "document", contextId: doc.id, contextName: doc.title },
            }),
        },
        {
          label: "Mở trên trình duyệt",
          icon: "open-outline" as keyof typeof Ionicons.glyphMap,
          disabled: !doc.downloadUrl,
          onPress: handleOpenExternal,
        },
        {
          label: "Xóa",
          icon: "trash-outline" as keyof typeof Ionicons.glyphMap,
          destructive: true,
          onPress: () => {
            deleteDocument.mutate(doc.id, { onSuccess: () => router.back() });
          },
        },
      ]
    : [];

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <HeaderBar title="Tài liệu" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <SkeletonCard height={120} />
          <SkeletonCard height={80} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!doc) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar
        title={doc.title}
        onBack={() => router.back()}
        right={<HeaderIconButton icon="ellipsis-horizontal" accessibilityLabel="Tùy chọn khác" onPress={() => setShowActions(true)} />}
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <DocumentMetaCard doc={doc} />

        {/* Primary actions */}
        <View style={{ gap: 12 }}>
          {doc.downloadUrl && (
            <Pressable
              onPress={handleOpenExternal}
              style={({ pressed }) => ({
                ...brutalCtaStyle,
                backgroundColor: colors.fptBlue,
                flexDirection: "row",
                gap: 8,
                ...pressedBrutalStyle(pressed),
              })}
              accessibilityRole="button"
              accessibilityLabel="Mở tài liệu"
            >
              <Ionicons name="open-outline" size={18} color={colors.onBrand} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.onBrand }}>Mở tài liệu</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(tabs)/chat",
                params: { contextType: "document", contextId: doc.id, contextName: doc.title },
              })
            }
            disabled={doc.status !== "ready"}
            style={({ pressed }) => ({
              ...brutalCtaStyle,
              backgroundColor: doc.status === "ready" ? colors.fptOrange : "#E5E5E5",
              flexDirection: "row",
              gap: 8,
              ...pressedBrutalStyle(pressed && doc.status === "ready"),
            })}
            accessibilityRole="button"
            accessibilityLabel="Trò chuyện về tài liệu này"
          >
            <Ionicons name="chatbubble-outline" size={18} color={doc.status === "ready" ? colors.onBrand : colors.muted} />
            <Text style={{ fontSize: 15, fontWeight: "700", color: doc.status === "ready" ? colors.onBrand : colors.muted }}>
              {doc.status === "ready" ? "Trò chuyện về tài liệu này" : "Cần xử lý xong để trò chuyện"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <ActionSheet
        visible={showActions}
        title={doc.title}
        subtitle={getMimeLabel(doc.mimeType)}
        actions={actions}
        onDismiss={() => setShowActions(false)}
      />
      <RenameDocumentModal
        visible={showRename}
        initialTitle={doc.title}
        onDismiss={() => setShowRename(false)}
        onConfirm={(newTitle) => {
          updateDoc.mutate(
            { id: doc.id, title: newTitle },
            { onSuccess: () => setShowRename(false) },
          );
        }}
        loading={updateDoc.isPending}
      />
      {showShare && (
        <ShareSheet
          visible={showShare}
          resourceType="document"
          resourceId={doc.id}
          resourceName={doc.title}
          onDismiss={() => setShowShare(false)}
        />
      )}
    </SafeAreaView>
  );
}
