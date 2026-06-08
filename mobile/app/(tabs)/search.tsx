import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { EmptyState } from "../../components/ui/EmptyState";
import { colors } from "../../constants/colors";
import { useSearch } from "../../hooks/useSearch";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  const { data: results, isFetching, error } = useSearch(debouncedQuery);

  const showEmpty = !isFetching && debouncedQuery.length > 2 && (results ?? []).length === 0;
  const showPrompt = debouncedQuery.length <= 2 && query.length === 0;
  const showShort = query.length > 0 && debouncedQuery.length <= 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 12,
          borderBottomWidth: 3,
          borderBottomColor: colors.ink,
          backgroundColor: colors.surface,
          gap: 4,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink }}>Search</Text>
        <Text style={{ fontSize: 13, color: colors.muted }}>Semantic search across your documents</Text>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: colors.surface,
            borderWidth: 3,
            borderColor: colors.ink,
            borderRadius: 14,
            paddingHorizontal: 14,
            shadowColor: colors.ink,
            shadowOffset: { width: 4, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 4,
            minHeight: 52,
          }}
        >
          <Ionicons name="search" size={20} color={colors.ink} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Ask anything about your documents..."
            placeholderTextColor={colors.muted}
            style={{ flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 12 }}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isFetching && <ActivityIndicator size="small" color={colors.fptBlue} />}
          {query.length > 0 && !isFetching && (
            <Pressable
              onPress={() => { setQuery(""); inputRef.current?.focus(); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Results */}
      {showPrompt && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 20 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              borderWidth: 3,
              borderColor: colors.ink,
              backgroundColor: colors.fptBlue,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.ink,
              shadowOffset: { width: 4, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 4,
            }}
          >
            <Ionicons name="search" size={36} color={colors.onBrand} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
            Semantic Search
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 }}>
            Ask questions in natural language — APMS finds the most relevant passages in your documents.
          </Text>
          {["What is gradient descent?", "Key points of Chapter 3", "Explain memory management"].map((q) => (
            <Pressable
              key={q}
              onPress={() => setQuery(q)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#F0F0F0" : colors.surface,
                borderWidth: 2,
                borderColor: colors.ink,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              })}
            >
              <Ionicons name="sparkles-outline" size={16} color={colors.fptOrange} />
              <Text style={{ fontSize: 13, color: colors.ink, fontWeight: "600" }}>{q}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {showShort && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>Type at least 3 characters to search</Text>
        </View>
      )}

      {showEmpty && (
        <EmptyState
          icon="search-outline"
          title="No results found"
          description={`No relevant passages found for "${debouncedQuery}". Try different keywords.`}
          style={{ marginTop: 40 }}
        />
      )}

      {error && (
        <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 20 }}>
          <Text style={{ color: colors.error, textAlign: "center" }}>Search failed. Check your connection and try again.</Text>
        </View>
      )}

      {results && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 12 }}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => router.push(`/documents/${item.documentId}`)}
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                borderWidth: 3,
                borderColor: colors.ink,
                borderRadius: 16,
                padding: 16,
                gap: 10,
                shadowColor: colors.ink,
                shadowOffset: pressed ? { width: 0, height: 0 } : { width: 4, height: 4 },
                shadowOpacity: pressed ? 0 : 1,
                shadowRadius: 0,
                elevation: pressed ? 0 : 4,
                transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : [],
              })}
              accessibilityRole="button"
              accessibilityLabel={`Result ${index + 1}: ${item.documentTitle}`}
            >
              {/* Score badge */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      backgroundColor: colors.fptOrange,
                      borderWidth: 2,
                      borderColor: colors.ink,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "800", color: colors.onBrand }}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>
                    {(item.score * 100).toFixed(0)}% match
                  </Text>
                </View>
                {item.pageNumber !== null && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="bookmark-outline" size={12} color={colors.muted} />
                    <Text style={{ fontSize: 11, color: colors.muted }}>p.{item.pageNumber}</Text>
                  </View>
                )}
              </View>

              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
                {item.documentTitle}
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  color: colors.muted,
                  lineHeight: 19,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.fptBlue,
                  paddingLeft: 10,
                }}
                numberOfLines={4}
              >
                {item.excerpt}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="open-outline" size={12} color={colors.fptBlue} />
                <Text style={{ fontSize: 12, color: colors.fptBlue, fontWeight: "700" }}>View document</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
