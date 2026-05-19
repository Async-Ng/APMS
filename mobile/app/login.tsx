import { signInWithRedirect } from "aws-amplify/auth";
import { useRef } from "react";
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
  { label: "Features", key: "hero" as const },
  { label: "Materials", key: "catalog" as const },
  { label: "Progress", key: "progress" as const },
  { label: "Reviews", key: "testimonials" as const },
];

type SectionKey = (typeof navLinks)[number]["key"];

export default function LoginScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<SectionKey, number>>({
    hero: 0,
    catalog: 0,
    progress: 0,
    testimonials: 0,
  });

  async function handleGoogleSignIn() {
    await signInWithRedirect({ provider: "Google" });
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
            <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: 14 }}>Sign in</Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>FPT University · Study hub</Text>
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
            Academic Personal Management
          </Text>
        </View>
        <Text style={{ fontSize: 32, fontWeight: "800", color: colors.ink, lineHeight: 38 }}>
          Learn smarter with <Text style={{ color: colors.fptOrange }}>your documents</Text>
        </Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
          Sign in with Google to manage study materials and chat with an AI assistant grounded in
          your own files.
        </Text>
      </View>

      <View style={{ ...brutalCardStyle, padding: 20, gap: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink }}>Welcome back</Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          Use your Google account to continue.
        </Text>
        <Pressable
          onPress={() => void handleGoogleSignIn()}
          style={({ pressed }) => ({
            ...brutalCtaStyle,
            backgroundColor: colors.fptBlue,
            ...pressedBrutalStyle(pressed),
          })}
        >
          <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: 16 }}>
            Continue with Google
          </Text>
        </Pressable>
        <Text style={{ textAlign: "center", color: colors.muted, fontSize: 11 }}>
          Secure sign-in via Amazon Cognito
        </Text>
      </View>

      <View
        onLayout={(e) => {
          sectionOffsets.current.catalog = e.nativeEvent.layout.y;
        }}
        style={{ gap: 12 }}
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink }}>
          Materials catalog preview
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
          Your study progress
        </Text>
        <Text style={{ color: colors.muted }}>68% of materials indexed — demo preview</Text>
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
          What students are saying
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
          Ready to start learning?
        </Text>
        <Pressable
          onPress={() => void handleGoogleSignIn()}
          style={({ pressed }) => ({
            ...brutalCtaStyle,
            backgroundColor: colors.fptBlue,
            width: "100%",
            ...pressedBrutalStyle(pressed),
          })}
        >
          <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: 16 }}>
            Continue with Google
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
