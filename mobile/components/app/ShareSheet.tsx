import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { colors } from "../../constants/colors";
import { api } from "../../lib/api-client";
import { getErrorMessage } from "../../lib/api-error";
import { useCreateShare } from "../../hooks/useShares";
import { useToastStore } from "../../stores/toast-store";
import { BrutalButton } from "../ui/BrutalButton";

interface UserResult {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ShareSheetProps {
  visible: boolean;
  resourceType: "folder" | "document";
  resourceId: string;
  resourceName: string;
  onDismiss: () => void;
}

export function ShareSheet({ visible, resourceType, resourceId, resourceName, onDismiss }: ShareSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserResult[]>([]);
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    if (visible) {
      setQuery("");
      setSelected([]);
      setPendingEmails([]);
      setDebouncedQuery("");
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 600, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 400);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ["users-search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.trim().length < 2) return [] as UserResult[];
      const res = await api.get<{ status: string; data: UserResult[] }>("/users/search", {
        params: debouncedQuery.includes("@") ? { email: debouncedQuery } : { displayName: debouncedQuery },
      });
      return res.data.data;
    },
    enabled: debouncedQuery.trim().length >= 2,
  });

  const createShare = useCreateShare();

  function toggleUser(user: UserResult) {
    setSelected((prev) =>
      prev.find((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user],
    );
  }

  function addPendingEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized) || pendingEmails.includes(normalized)) return;
    setPendingEmails((prev) => [...prev, normalized]);
    setQuery("");
  }

  function removePendingEmail(email: string) {
    setPendingEmails((prev) => prev.filter((e) => e !== email));
  }

  function handleShare() {
    createShare.mutate(
      {
        resourceType,
        resourceId,
        sharedWithUserIds: selected.map((u) => u.id),
        emails: pendingEmails,
      },
      {
        onSuccess: (result) => {
          if (result.skipped > 0) {
            useToastStore.getState().show(`Đã bỏ qua ${result.skipped} người nhận không hợp lệ`);
          }
          onDismiss();
        },
        onError: (err) => {
          useToastStore.getState().show(getErrorMessage(err, "Chia sẻ thất bại. Vui lòng thử lại."));
        },
      },
    );
  }

  const results = (searchQuery.data ?? []).filter((u) => !selected.find((s) => s.id === u.id));
  const showInviteByEmail =
    debouncedQuery.trim().length >= 3 &&
    EMAIL_RE.test(debouncedQuery.trim()) &&
    !searchQuery.isFetching &&
    results.length === 0 &&
    !pendingEmails.includes(debouncedQuery.trim().toLowerCase());
  const totalRecipients = selected.length + pendingEmails.length;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Pressable style={{ flex: 1 }} onPress={onDismiss}>
        <Animated.View
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", opacity, justifyContent: "flex-end" }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Pressable>
              <Animated.View
                style={{
                  backgroundColor: colors.bg,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  borderWidth: 3,
                  borderBottomWidth: 0,
                  borderColor: colors.ink,
                  paddingHorizontal: 20,
                  paddingBottom: insets.bottom + 16,
                  maxHeight: 520,
                  transform: [{ translateY }],
                }}
              >
                <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
                  <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
                </View>

                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, marginTop: 8 }}>
                  Chia sẻ &ldquo;{resourceName}&rdquo;
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 16, marginTop: 2 }}>
                  Tìm theo tên hoặc email
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderWidth: 3,
                    borderColor: colors.ink,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: colors.surface,
                    marginBottom: 12,
                    minHeight: 48,
                  }}
                >
                  <Ionicons name="search-outline" size={18} color={colors.muted} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Tìm người dùng..."
                    placeholderTextColor={colors.muted}
                    style={{ flex: 1, fontSize: 15, color: colors.ink }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  {searchQuery.isFetching && <ActivityIndicator size="small" color={colors.fptBlue} />}
                </View>

                {(selected.length > 0 || pendingEmails.length > 0) && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    {selected.map((u) => (
                      <Pressable
                        key={u.id}
                        onPress={() => toggleUser(u)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: colors.fptBlue,
                          borderWidth: 2,
                          borderColor: colors.ink,
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onBrand }}>{u.displayName}</Text>
                        <Ionicons name="close" size={12} color={colors.onBrand} />
                      </Pressable>
                    ))}
                    {pendingEmails.map((email) => (
                      <Pressable
                        key={email}
                        onPress={() => removePendingEmail(email)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: colors.surface,
                          borderWidth: 2,
                          borderColor: colors.fptOrange,
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Ionicons name="mail-outline" size={12} color={colors.fptOrange} />
                        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }}>{email}</Text>
                        <Ionicons name="close" size={12} color={colors.ink} />
                      </Pressable>
                    ))}
                  </View>
                )}

                {showInviteByEmail && (
                  <Pressable
                    onPress={() => addPendingEmail(debouncedQuery.trim())}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 4,
                      backgroundColor: pressed ? "#F0F0F0" : "transparent",
                      borderRadius: 8,
                      minHeight: 48,
                      marginBottom: 8,
                    })}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        borderWidth: 2,
                        borderColor: colors.ink,
                        backgroundColor: colors.fptOrange,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="mail-outline" size={16} color={colors.onBrand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>
                        Mời qua email: {debouncedQuery.trim()}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        Người này chưa có tài khoản — sẽ nhận email mời
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={colors.fptOrange} />
                  </Pressable>
                )}

                {results.length > 0 && (
                  <FlatList
                    data={results}
                    keyExtractor={(u) => u.id}
                    style={{ maxHeight: 160 }}
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => toggleUser(item)}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          paddingVertical: 10,
                          paddingHorizontal: 4,
                          backgroundColor: pressed ? "#F0F0F0" : "transparent",
                          borderRadius: 8,
                          minHeight: 48,
                        })}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            borderWidth: 2,
                            borderColor: colors.ink,
                            backgroundColor: colors.fptGreen,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: "800", color: colors.onBrand }}>
                            {item.displayName[0]?.toUpperCase() ?? "?"}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>{item.displayName}</Text>
                          <Text style={{ fontSize: 12, color: colors.muted }}>{item.email}</Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={22} color={colors.fptGreen} />
                      </Pressable>
                    )}
                  />
                )}

                <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                  <BrutalButton label="Huỷ" onPress={onDismiss} variant="ghost" style={{ flex: 1 }} />
                  <BrutalButton
                    label={`Chia sẻ (${totalRecipients})`}
                    onPress={handleShare}
                    variant="secondary"
                    loading={createShare.isPending}
                    disabled={totalRecipients === 0}
                    style={{ flex: 1 }}
                  />
                </View>
              </Animated.View>
            </Pressable>
          </KeyboardAvoidingView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
