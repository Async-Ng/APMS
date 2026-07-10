import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../constants/colors";
import { useDrive } from "../../hooks/useDrive";
import { BrutalButton } from "../ui/BrutalButton";

interface Crumb {
  id: string | null;
  name: string;
}

interface FolderPickerModalProps {
  visible: boolean;
  title: string;
  initialFolderId: string | null;
  excludeFolderId?: string;
  submitError?: string | null;
  loading?: boolean;
  onConfirm: (folderId: string | null) => void;
  onDismiss: () => void;
}

export function FolderPickerModal({
  visible,
  title,
  initialFolderId,
  excludeFolderId,
  submitError,
  loading = false,
  onConfirm,
  onDismiss,
}: FolderPickerModalProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(600)).current;
  const [trail, setTrail] = useState<Crumb[]>([{ id: null, name: "Drive của tôi" }]);
  const current = trail[trail.length - 1]!;

  useEffect(() => {
    if (visible) {
      setTrail([{ id: null, name: "Drive của tôi" }]);
      Animated.spring(translateY, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: 600, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, translateY]);

  const { data, isLoading } = useDrive(current.id);
  const folders = (data?.folders ?? []).filter((f) => f.id !== excludeFolderId);
  const targetIsUnchanged = current.id === initialFolderId;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onDismiss}>
        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: "80%",
            backgroundColor: colors.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 3,
            borderBottomWidth: 0,
            borderColor: colors.ink,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY }],
          }}
        >
          <Pressable>
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
            </View>

            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, marginBottom: 12 }}>
              {title}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {trail.map((crumb, index) => {
                  const isLast = index === trail.length - 1;
                  return (
                    <View key={crumb.id ?? "root"} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Pressable
                        disabled={isLast}
                        onPress={() => setTrail(trail.slice(0, index + 1))}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: isLast ? "800" : "600",
                            color: isLast ? colors.ink : colors.muted,
                          }}
                        >
                          {crumb.name}
                        </Text>
                      </Pressable>
                      {!isLast && <Ionicons name="chevron-forward" size={14} color={colors.muted} />}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View
              style={{
                minHeight: 160,
                maxHeight: 320,
                borderWidth: 3,
                borderColor: colors.ink,
                borderRadius: 12,
                backgroundColor: colors.surface,
                marginBottom: 12,
              }}
            >
              {isLoading ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <ActivityIndicator color={colors.fptBlue} />
                </View>
              ) : folders.length === 0 ? (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: colors.muted, fontSize: 14 }}>Không có thư mục con.</Text>
                </View>
              ) : (
                <FlatList
                  data={folders}
                  keyExtractor={(f) => f.id}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setTrail([...trail, { id: item.id, name: item.name }])}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        backgroundColor: pressed ? "#F0F0F0" : "transparent",
                      })}
                    >
                      <Ionicons
                        name="folder"
                        size={20}
                        color={item.color ?? colors.fptOrange}
                      />
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                    </Pressable>
                  )}
                />
              )}
            </View>

            {submitError && (
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.error, marginBottom: 8 }}>
                {submitError}
              </Text>
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              <BrutalButton label="Huỷ" onPress={onDismiss} variant="ghost" style={{ flex: 1 }} />
              <BrutalButton
                label="Chuyển vào đây"
                onPress={() => onConfirm(current.id)}
                variant="primary"
                loading={loading}
                disabled={targetIsUnchanged}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
