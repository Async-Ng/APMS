import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../../constants/colors";
import { type DriveDocument, type DriveFolder, useDrive } from "../../../hooks/useDrive";
import { type CreateChatSessionInput } from "../../../hooks/useChat";
import { BrutalButton } from "../../ui/BrutalButton";

type Selection =
  | { kind: "all" }
  | { kind: "folder"; folder: DriveFolder }
  | { kind: "documents"; documents: DriveDocument[] };

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface ChatSourcePickerSheetProps {
  visible: boolean;
  loading?: boolean;
  onDismiss: () => void;
  onCreate: (input: CreateChatSessionInput) => void;
}

function canChatWithDocument(doc: DriveDocument): boolean {
  return doc.status === "ready" || (doc.status === "processing" && (doc.chunkCount ?? 0) > 0);
}

function buildCreateInput(selection: Selection): CreateChatSessionInput | null {
  if (selection.kind === "all") return { contextType: "all" };
  if (selection.kind === "folder") return { contextType: "folder", contextId: selection.folder.id };
  if (selection.documents.length === 0) return null;
  if (selection.documents.length === 1) {
    return { contextType: "document", contextId: selection.documents[0]!.id };
  }
  return { contextType: "documents", contextIds: selection.documents.map((doc) => doc.id) };
}

function selectionCount(selection: Selection | null): number {
  if (!selection) return 0;
  if (selection.kind === "documents") return selection.documents.length;
  return 1;
}

export function ChatSourcePickerSheet({
  visible,
  loading = false,
  onDismiss,
  onCreate,
}: ChatSourcePickerSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(720)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [folderId, setFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: "Drive của tôi" }]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const { data, isLoading } = useDrive(folderId);

  useEffect(() => {
    if (visible) {
      setFolderId(null);
      setBreadcrumbs([{ id: null, name: "Drive của tôi" }]);
      setSelection(null);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 720, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  function openFolder(folder: DriveFolder) {
    setFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }

  function navigateTo(index: number) {
    const crumb = breadcrumbs[index];
    if (!crumb) return;
    setFolderId(crumb.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }

  function toggleDocument(doc: DriveDocument) {
    if (!canChatWithDocument(doc)) return;
    setSelection((prev) => {
      if (prev?.kind !== "documents") return { kind: "documents", documents: [doc] };
      const exists = prev.documents.some((item) => item.id === doc.id);
      const next = exists
        ? prev.documents.filter((item) => item.id !== doc.id)
        : [...prev.documents, doc].slice(0, 20);
      return next.length > 0 ? { kind: "documents", documents: next } : null;
    });
  }

  function selectAllVisibleDocuments() {
    const docs = (data?.documents ?? []).filter(canChatWithDocument).slice(0, 20);
    if (docs.length > 0) setSelection({ kind: "documents", documents: docs });
  }

  function handleCreate() {
    if (!selection || loading) return;
    const body = buildCreateInput(selection);
    if (body) onCreate(body);
  }

  const count = selectionCount(selection);
  const currentFolderName = breadcrumbs[breadcrumbs.length - 1]?.name ?? "Drive";

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View
          pointerEvents="none"
          style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", opacity }}
        />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Đóng chọn nguồn chat" />
        <Animated.View
          style={{
            maxHeight: "88%",
            backgroundColor: colors.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 3,
            borderBottomWidth: 0,
            borderColor: colors.ink,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY }],
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
          </View>

          <View style={{ paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "#E5E5E5" }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink }}>Chọn nguồn Chat AI</Text>
            <Text style={{ marginTop: 2, fontSize: 13, color: colors.muted }}>
              Chọn toàn bộ Drive, một thư mục hoặc tối đa 20 tài liệu.
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
            <Pressable
              onPress={() => setSelection({ kind: "all" })}
              style={({ pressed }) => ({
                minHeight: 64,
                borderWidth: 3,
                borderColor: colors.ink,
                borderRadius: 14,
                padding: 12,
                backgroundColor: selection?.kind === "all" ? colors.fptOrange : pressed ? "#F0F0F0" : colors.surface,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              })}
              accessibilityRole="button"
              accessibilityState={{ selected: selection?.kind === "all" }}
            >
              <Ionicons name="layers-outline" size={24} color={selection?.kind === "all" ? colors.onBrand : colors.fptBlue} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: selection?.kind === "all" ? colors.onBrand : colors.ink }}>
                  Toàn bộ tài liệu
                </Text>
                <Text style={{ fontSize: 12, color: selection?.kind === "all" ? "rgba(255,255,255,0.82)" : colors.muted }}>
                  Chat với mọi tài liệu bạn có quyền đọc.
                </Text>
              </View>
            </Pressable>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {breadcrumbs.map((crumb, index) => (
                <Pressable
                  key={`${crumb.id ?? "root"}-${index}`}
                  onPress={() => navigateTo(index)}
                  style={({ pressed }) => ({
                    minHeight: 36,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: colors.ink,
                    backgroundColor: index === breadcrumbs.length - 1 ? colors.fptBlue : pressed ? "#F0F0F0" : colors.surface,
                    justifyContent: "center",
                  })}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 12, fontWeight: "800", color: index === breadcrumbs.length - 1 ? colors.onBrand : colors.ink }}>
                    {crumb.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {folderId && (
              <Pressable
                onPress={() => {
                  const folder: DriveFolder = {
                    id: folderId,
                    name: currentFolderName,
                    color: null,
                    isStarred: false,
                    parentId: null,
                    createdAt: "",
                    updatedAt: "",
                  };
                  setSelection({ kind: "folder", folder });
                }}
                style={({ pressed }) => ({
                  minHeight: 48,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  backgroundColor: selection?.kind === "folder" && selection.folder.id === folderId ? colors.fptOrange : pressed ? "#F0F0F0" : colors.surface,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                })}
                accessibilityRole="button"
              >
                <Ionicons name="folder-open-outline" size={18} color={colors.ink} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "800", color: colors.ink }} numberOfLines={1}>
                  Chọn thư mục này
                </Text>
              </Pressable>
            )}

            <View style={{ flexDirection: "row", gap: 8 }}>
              <BrutalButton label="Chọn tệp trong màn này" onPress={selectAllVisibleDocuments} variant="ghost" size="sm" style={{ flex: 1 }} />
              <BrutalButton label="Xóa chọn" onPress={() => setSelection(null)} variant="ghost" size="sm" style={{ flex: 1 }} disabled={count === 0} />
            </View>

            {isLoading ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <ActivityIndicator color={colors.fptBlue} />
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {(data?.folders ?? []).map((folder) => (
                  <Pressable
                    key={folder.id}
                    onPress={() => openFolder(folder)}
                    style={({ pressed }) => ({
                      minHeight: 56,
                      borderWidth: 2,
                      borderColor: colors.ink,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      backgroundColor: pressed ? "#F0F0F0" : colors.surface,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    })}
                    accessibilityRole="button"
                    accessibilityLabel={`Mở thư mục ${folder.name}`}
                  >
                    <Ionicons name="folder" size={22} color={folder.color ?? colors.fptBlue} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "800", color: colors.ink }} numberOfLines={1}>
                      {folder.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </Pressable>
                ))}

                {(data?.documents ?? []).map((doc) => {
                  const selected = selection?.kind === "documents" && selection.documents.some((item) => item.id === doc.id);
                  const enabled = canChatWithDocument(doc);
                  return (
                    <Pressable
                      key={doc.id}
                      onPress={() => toggleDocument(doc)}
                      disabled={!enabled}
                      style={({ pressed }) => ({
                        minHeight: 64,
                        borderWidth: 2,
                        borderColor: colors.ink,
                        borderRadius: 12,
                        padding: 12,
                        opacity: enabled ? 1 : 0.45,
                        backgroundColor: selected ? "#FFE600" : pressed ? "#F0F0F0" : colors.surface,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      })}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected, disabled: !enabled }}
                      accessibilityLabel={`Chọn tài liệu ${doc.title}`}
                    >
                      <Ionicons name={selected ? "checkmark-circle" : "document-text-outline"} size={22} color={selected ? colors.fptGreen : colors.fptBlue} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: colors.ink }} numberOfLines={2}>
                          {doc.title}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.muted }}>
                          {enabled ? "Có thể dùng để hỏi đáp" : "Chưa sẵn sàng để chat"}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10, borderTopWidth: 2, borderTopColor: colors.ink }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.muted }}>
              Đã chọn: {count}{selection?.kind === "documents" ? "/20 tài liệu" : ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <BrutalButton label="Huỷ" onPress={onDismiss} variant="ghost" style={{ flex: 1 }} disabled={loading} />
              <BrutalButton label="Bắt đầu" onPress={handleCreate} variant="primary" style={{ flex: 1 }} disabled={!selection || loading} loading={loading} />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
