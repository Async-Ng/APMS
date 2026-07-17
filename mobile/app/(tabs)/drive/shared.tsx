import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, SafeAreaView, Text, View } from "react-native";

import { EmptyState } from "../../../components/ui/EmptyState";
import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import {
  formatSharedAt,
  getResourceLabel,
  getShareWithMeLabel,
  useRevokeShare,
  useSharesByMe,
  useSharesWithMe,
  type ShareByMeGroup,
  type ShareWithMeItem,
} from "../../../hooks/useShares";

type TabId = "incoming" | "outgoing";

const TABS: { id: TabId; label: string }[] = [
  { id: "incoming", label: "Chia sẻ với tôi" },
  { id: "outgoing", label: "Tôi đã chia sẻ" },
];

function ReceivedRow({ item, onPress }: { item: ShareWithMeItem; onPress: () => void }) {
  const isFolder = item.resource.type === "folder";
  const label = getShareWithMeLabel(item);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: colors.surface,
        borderWidth: 3,
        borderColor: colors.ink,
        borderRadius: 14,
        padding: 14,
        shadowColor: colors.ink,
        shadowOffset: pressed ? { width: 0, height: 0 } : { width: 4, height: 4 },
        shadowOpacity: pressed ? 0 : 1,
        shadowRadius: 0,
        elevation: pressed ? 0 : 4,
        transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : [],
      })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: colors.ink,
          backgroundColor: isFolder ? colors.fptBlue : "#F8F8F8",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={isFolder ? "folder" : "document-outline"}
          size={22}
          color={isFolder ? colors.onBrand : colors.muted}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
          {label}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          {isFolder ? "Thư mục" : "Tài liệu"} · Chia sẻ {formatSharedAt(item.share.sharedAt)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function OutgoingGroup({ group }: { group: ShareByMeGroup }) {
  const revokeShare = useRevokeShare();
  const label = getResourceLabel(group);
  const isFolder = group.resourceType === "folder";
  const isDeleted = !group.resource;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 3,
        borderColor: colors.ink,
        borderRadius: 14,
        padding: 14,
        gap: 10,
        shadowColor: colors.ink,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons
          name={isFolder ? "folder-outline" : "document-outline"}
          size={18}
          color={isDeleted ? colors.muted : colors.fptBlue}
        />
        <Text
          style={{ flex: 1, fontSize: 15, fontWeight: "800", color: isDeleted ? colors.muted : colors.ink }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {isDeleted && (
          <View
            style={{
              borderWidth: 1.5,
              borderColor: colors.error,
              backgroundColor: "#FEF2F2",
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: colors.error }}>Mục đã xóa</Text>
          </View>
        )}
      </View>

      {group.shares.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.muted }}>Chưa có người nhận.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {group.shares.map((share) => (
            <View
              key={share.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderWidth: 2,
                borderColor: "#E5E5E5",
                backgroundColor: colors.bg,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
                  {share.sharedWithUser?.displayName ?? "Người dùng không xác định"}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }} numberOfLines={1}>
                  {share.sharedWithUser?.email ?? share.sharedWithUserId} · Chia sẻ {formatSharedAt(share.sharedAt)}
                </Text>
              </View>
              <Pressable
                onPress={() => revokeShare.mutate(share.id)}
                disabled={revokeShare.isPending}
                style={({ pressed }) => ({
                  minHeight: 44,
                  borderWidth: 2,
                  borderColor: colors.error,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  opacity: revokeShare.isPending ? 0.5 : pressed ? 0.7 : 1,
                })}
                accessibilityRole="button"
                accessibilityLabel="Thu hồi chia sẻ"
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.error }}>Thu hồi</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SharedScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("incoming");

  const received = useSharesWithMe();
  const outgoing = useSharesByMe();

  const incomingCount = received.data?.length ?? 0;
  const outgoingCount = outgoing.data?.length ?? 0;

  function navigateToReceived(item: ShareWithMeItem) {
    if (item.resource.type === "folder") {
      router.push(`/(tabs)/drive/${item.resource.data.id}?shared=1`);
    } else {
      router.push(`/documents/${item.resource.data.id}`);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar title="Đã chia sẻ" onBack={() => router.back()} />

      {/* Tabs */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {TABS.map((t) => {
          const count = t.id === "incoming" ? incomingCount : outgoingCount;
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={({ pressed }) => ({
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderWidth: 2,
                borderColor: colors.ink,
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: active ? colors.fptOrange : pressed ? "#F0F0F0" : colors.surface,
              })}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: active ? colors.onBrand : colors.ink }}>
                {t.label}
              </Text>
              {count > 0 && (
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.bg,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "800", color: active ? colors.onBrand : colors.muted }}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {tab === "incoming" ? (
        received.isLoading ? (
          <View style={{ padding: 16 }}>
            <SkeletonList count={3} />
          </View>
        ) : (
          <FlatList
            data={received.data ?? []}
            keyExtractor={(item) => item.share.id}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40, flexGrow: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={received.isFetching && !received.isLoading}
                onRefresh={() => void received.refetch()}
                tintColor={colors.fptBlue}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="people-outline"
                title="Chưa có mục được chia sẻ với bạn"
                description="Khi ai đó chia sẻ thư mục hoặc tệp với bạn, chúng sẽ hiển thị tại đây."
              />
            }
            renderItem={({ item }) => (
              <ReceivedRow item={item} onPress={() => navigateToReceived(item)} />
            )}
          />
        )
      ) : outgoing.isLoading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={3} />
        </View>
      ) : (
        <FlatList
          data={outgoing.data ?? []}
          keyExtractor={(group) => `${group.resourceType}-${group.resourceId}`}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={outgoing.isFetching && !outgoing.isLoading}
              onRefresh={() => void outgoing.refetch()}
              tintColor={colors.fptBlue}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="share-social-outline"
              title="Bạn chưa chia sẻ gì"
              description="Chia sẻ thư mục hoặc tệp từ Drive của tôi bằng thao tác Chia sẻ."
            />
          }
          renderItem={({ item }) => <OutgoingGroup group={item} />}
        />
      )}
    </SafeAreaView>
  );
}
