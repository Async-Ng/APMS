import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, Text, TextInput, View } from "react-native";

import { SearchPromptState } from "../../components/app/SearchPromptState";
import { SearchResultCard } from "../../components/app/SearchResultCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { HeaderBar } from "../../components/ui/HeaderBar";
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
      <HeaderBar title="Tìm kiếm" subtitle="Tìm kiếm ngữ nghĩa trong tài liệu của bạn" />

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
            placeholder="Hỏi bất cứ điều gì về tài liệu của bạn..."
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
      {showPrompt && <SearchPromptState onPickSuggestion={setQuery} />}

      {showShort && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>Nhập ít nhất 3 ký tự để tìm kiếm</Text>
        </View>
      )}

      {showEmpty && (
        <EmptyState
          icon="search-outline"
          title="Không tìm thấy kết quả"
          description={`Không có đoạn nào phù hợp với "${debouncedQuery}". Hãy thử từ khóa khác.`}
          style={{ marginTop: 40 }}
        />
      )}

      {error && (
        <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 20 }}>
          <Text style={{ color: colors.error, textAlign: "center" }}>Tìm kiếm thất bại. Kiểm tra kết nối và thử lại.</Text>
        </View>
      )}

      {results && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 12 }}
          renderItem={({ item, index }) => (
            <SearchResultCard result={item} index={index} onPress={() => router.push(`/documents/${item.documentId}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}
