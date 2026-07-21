import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { brutalCtaStyle, pressedBrutalStyle } from "../../lib/brutal-style";

export interface FabAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

interface FabProps {
  actions: FabAction[];
}

export function Fab({ actions }: FabProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <Pressable
          style={{ position: "absolute", inset: 0, zIndex: 20 }}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Đóng menu thêm mục"
        />
      )}
      {open && (
        <View
          style={{
            position: "absolute",
            bottom: 158,
            right: 20,
            gap: 12,
            alignItems: "flex-end",
            zIndex: 30,
            elevation: 30,
          }}
        >
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                setOpen(false);
                action.onPress();
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: action.color,
                borderWidth: 3,
                borderColor: colors.ink,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                minHeight: 52,
                maxWidth: 240,
                shadowColor: colors.ink,
                shadowOffset: pressed ? { width: 0, height: 0 } : { width: 4, height: 4 },
                shadowOpacity: pressed ? 0 : 1,
                shadowRadius: 0,
                elevation: pressed ? 0 : 4,
                transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : [],
              })}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Ionicons name={action.icon} size={18} color={colors.onBrand} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.onBrand }} numberOfLines={2}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => ({
          ...brutalCtaStyle,
          position: "absolute",
          bottom: 90,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: open ? colors.ink : colors.fptOrange,
          zIndex: 40,
          elevation: 40,
          ...pressedBrutalStyle(pressed),
        })}
        accessibilityLabel="Thêm mục"
        accessibilityRole="button"
      >
        <Ionicons name={open ? "close" : "add"} size={28} color={colors.onBrand} />
      </Pressable>
    </>
  );
}
