import { colors } from "../constants/colors";

export function pressedBrutalStyle(pressed: boolean) {
  return {
    transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : [],
    shadowOffset: pressed ? { width: 0, height: 0 } : { width: 4, height: 4 },
    shadowOpacity: pressed ? 0 : 1,
    shadowRadius: 0,
    elevation: pressed ? 0 : 4,
  } as const;
}

export const brutalCardStyle = {
  backgroundColor: colors.surface,
  borderWidth: 3,
  borderColor: colors.ink,
  borderRadius: 16,
  shadowColor: colors.ink,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
} as const;

export const brutalCtaStyle = {
  backgroundColor: colors.fptOrange,
  borderWidth: 3,
  borderColor: colors.ink,
  borderRadius: 12,
  minHeight: 44,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  shadowColor: colors.ink,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
};
