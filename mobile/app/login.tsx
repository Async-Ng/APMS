import { signInWithRedirect } from "aws-amplify/auth";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { colors } from "../constants/colors";
import { brutalCardStyle, brutalCtaStyle, pressedBrutalStyle } from "../lib/brutal-style";

const catalogItems = [
  { title: "CS101 Slides", tag: "Presentation", color: colors.fptBlue },
  { title: "WDP301 Docs", tag: "Course pack", color: colors.fptGreen },
  { title: "Thesis PDF", tag: "Research", color: colors.fptOrange },
];

const testimonials = [
  {
    name: "Minh Anh",
    role: "WDP301 — FPT University",
    quote: "I finally found answers inside my own lecture notes.",
  },
  {
    name: "Hoang Long",
    role: "SE — FPT University",
    quote: "Cited AI replies saved me hours every week.",
  },
];

const navLinks = [
  { label: "Tính năng", key: "hero" as const },
  { label: "Tài liệu", key: "catalog" as const },
  { label: "Tiến độ", key: "progress" as const },
  { label: "Đánh giá", key: "testimonials" as const },
];

type SectionKey = (typeof navLinks)[number]["key"];

export default function LoginScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const sectionOffsets = useRef<Record<SectionKey, number>>({
    hero: 0,
    catalog: 0,
    progress: 0,
    testimonials: 0,
  });

  async function handleGoogleSignIn() {
    if (signingIn) return;
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithRedirect({ provider: "Google" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes("canceled")) {
        setAuthError("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } finally {
      setSigningIn(false);
    }
  }

  function scrollToSection(key: SectionKey) {
    const y = sectionOffsets.current[key];
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 24 }}
    >
      <View style={{ ...brutalCardStyle, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 2 }}>
              <View
                style={{
                  width: 10,
                  height: 18,
                  backgroundColor: colors.fptBlue,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  borderRadius: 2,
                }}
              />
              <View
                style={{
                  width: 10,
                  height: 18,
                  backgroundColor: colors.fptOrange,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  borderRadius: 2,
                }}
              />
              <View
                style={{
                  width: 10,
                  height: 18,
                  backgroundColor: colors.fptGreen,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  borderRadius: 2,
                }}
              />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink }}>APMS</Text>
          </View>
          <Pressable
            onPress={() => scrollToSection("hero")}
            style={({ pressed }) => ({
              ...brutalCtaStyle,
              backgroundColor: colors.fptOrange,
              paddingHorizontal: 14,
              paddingVertical: 8,
              minHeight: 40,
              ...pressedBrutalStyle(pressed),
            })}
          >
            <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: 14 }}>Đăng nhập</Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Đại học FPT · Trung tâm học tập</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {navLinks.map((link) => (
            <Pressable
              key={link.key}
              onPress={() => scrollToSection(link.key)}
              style={({ pressed }) => ({
                borderWidth: 2,
                borderColor: colors.ink,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: pressed ? colors.fptBlue : colors.surface,
              })}
            >
              {({ pressed }) => (
                <Text
                  style={{
                    fontWeight: "700",
                    fontSize: 13,
                    color: pressed ? colors.onBrand : colors.ink,
                  }}
                >
                  {link.label}
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View
        onLayout={(e) => {
          sectionOffsets.current.hero = e.nativeEvent.layout.y;
        }}
        style={{ gap: 12 }}
      >
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: colors.fptGreen,
            borderWidth: 2,
            borderColor: colors.ink,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: 12 }}>
            Quản lý học tập cá nhân
          </Text>
        </View>
        <Text style={{ fontSize: 32, fontWeight: "800", color: colors.ink, lineHeight: 38 }}>
          Học thông minh hơn với <Text style={{ color: colors.fptOrange }}>tài liệu của bạn</Text>
        </Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
          Đăng nhập bằng Google để quản lý tài liệu học tập và trò chuyện với trợ lý AI dựa trên
          tệp của bạn.
        </Text>
      </View>

      <View style={{ ...brutalCardStyle, padding: 20, gap: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink }}>Chào mừng trở lại</Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          Dùng tài khoản Google để tiếp tục.
        </Text>
        {authError && (
          <Text style={{ color: colors.error, fontSize: 13, textAlign: "center" }}>{authError}</Text>
        )}
        <Pressable
          onPress={() => void handleGoogleSignIn()}
          disabled={signingIn}
          style={({ pressed }) => ({
            ...brutalCtaStyle,
            backgroundColor: signingIn ? colors.muted : colors.fptBlue,
            ...pressedBrutalStyle(pressed),
          })}
        >
          <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: 16 }}>
            {signingIn ? "Đang mở trình duyệt..." : "Tiếp tục với Google"}
          </Text>
        </Pressable>
        <Text style={{ textAlign: "center", color: colors.muted, fontSize: 11 }}>
          Đăng nhập bảo mật qua Amazon Cognito
        </Text>
      </View>

      <View
        onLayout={(e) => {
          sectionOffsets.current.catalog = e.nativeEvent.layout.y;
        }}
        style={{ gap: 12 }}
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink }}>
          Xem trước danh mục tài liệu
        </Text>
        {catalogItems.map((item) => (
          <View
            key={item.title}
            style={{
              ...brutalCardStyle,
              backgroundColor: item.color,
              padding: 16,
              gap: 8,
            }}
          >
            <Text
              style={{
                alignSelf: "flex-start",
                backgroundColor: colors.surface,
                color: colors.ink,
                borderWidth: 2,
                borderColor: colors.ink,
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              {item.tag}
            </Text>
            <Text style={{ color: colors.onBrand, fontSize: 18, fontWeight: "800" }}>
              {item.title}
            </Text>
          </View>
        ))}
      </View>

      <View
        onLayout={(e) => {
          sectionOffsets.current.progress = e.nativeEvent.layout.y;
        }}
        style={{ ...brutalCardStyle, padding: 20, gap: 12 }}
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink }}>
          Tiến độ học tập
        </Text>
        <Text style={{ color: colors.muted }}>68% tài liệu đã lập chỉ mục — bản xem trước</Text>
        <View
          style={{
            height: 14,
            borderWidth: 2,
            borderColor: colors.ink,
            borderRadius: 999,
            overflow: "hidden",
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ width: "68%", height: "100%", backgroundColor: colors.fptGreen }} />
        </View>
      </View>

      <View
        onLayout={(e) => {
          sectionOffsets.current.testimonials = e.nativeEvent.layout.y;
        }}
        style={{ gap: 12 }}
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink }}>
          Sinh viên nói gì
        </Text>
        {testimonials.map((item) => (
          <View key={item.name} style={{ ...brutalCardStyle, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 20 }}>
              &ldquo;{item.quote}&rdquo;
            </Text>
            <Text style={{ fontWeight: "800", color: colors.ink }}>{item.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{item.role}</Text>
          </View>
        ))}
      </View>

      <View
        style={{
          ...brutalCardStyle,
          backgroundColor: colors.fptOrange,
          padding: 24,
          gap: 16,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: colors.onBrand,
            fontSize: 24,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          Sẵn sàng bắt đầu học?
        </Text>
        <Pressable
          onPress={() => void handleGoogleSignIn()}
          disabled={signingIn}
          style={({ pressed }) => ({
            ...brutalCtaStyle,
            backgroundColor: signingIn ? colors.muted : colors.fptBlue,
            width: "100%",
            ...pressedBrutalStyle(pressed),
          })}
        >
          <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: 16 }}>
            {signingIn ? "Đang mở trình duyệt..." : "Tiếp tục với Google"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
