import { Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { type AppUser } from "../../stores/auth-store";
import { brutalCardStyle } from "../../lib/brutal-style";
import { StorageBar } from "../ui/StorageBar";

interface ProfileUserCardProps {
  user: AppUser | null;
  isAdmin: boolean;
}

export function ProfileUserCard({ user, isAdmin }: ProfileUserCardProps) {
  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <View style={{ padding: 16 }}>
      <View style={{ ...brutalCardStyle, padding: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              borderWidth: 3,
              borderColor: colors.ink,
              backgroundColor: colors.fptBlue,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.ink,
              shadowOffset: { width: 3, height: 3 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.onBrand }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink }} numberOfLines={1}>
              {user?.displayName ?? "—"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted }} numberOfLines={1}>
              {user?.email ?? "—"}
            </Text>
            {isAdmin && (
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: colors.fptOrange,
                  borderWidth: 1.5,
                  borderColor: colors.ink,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "800", color: colors.onBrand }}>ADMIN</Text>
              </View>
            )}
          </View>
        </View>

        {user && <StorageBar usedBytes={user.storageUsedBytes} quotaBytes={user.storageQuotaBytes} />}
      </View>
    </View>
  );
}
