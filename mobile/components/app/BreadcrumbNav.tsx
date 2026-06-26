import { Ionicons } from "@expo/vector-icons";
import { Fragment } from "react";
import { ScrollView, Pressable, Text } from "react-native";

import { colors } from "../../constants/colors";

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onNavigate: (id: string | null) => void;
}

export function BreadcrumbNav({ items, onNavigate }: BreadcrumbNavProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16 }}
    >
      {items.map((item, idx) => (
        <Fragment key={item.id ?? "root"}>
          {idx > 0 && (
            <Ionicons name="chevron-forward" size={14} color={colors.muted} />
          )}
          <Pressable
            onPress={() => onNavigate(item.id)}
            style={({ pressed }) => ({
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: idx === items.length - 1 ? colors.fptOrange : pressed ? "#F0F0F0" : "transparent",
              minHeight: 32,
              justifyContent: "center",
            })}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: idx === items.length - 1 ? "700" : "500",
                color: idx === items.length - 1 ? colors.onBrand : colors.muted,
              }}
            >
              {item.name}
            </Text>
          </Pressable>
        </Fragment>
      ))}
    </ScrollView>
  );
}
