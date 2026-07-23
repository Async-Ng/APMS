import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";
import Pdf from "react-native-pdf";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SkeletonCard } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { useDocument } from "../../../hooks/useDocuments";

export default function DocumentViewerScreen() {
  const { documentId, page } = useLocalSearchParams<{ documentId: string; page?: string }>();
  const router = useRouter();
  const targetPage = page ? Number(page) : undefined;

  const { data: doc, isLoading } = useDocument(documentId, true);
  const [loadError, setLoadError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <HeaderBar title="Đang tải..." onBack={() => router.back()} />
        <View style={{ padding: 16 }}>
          <SkeletonCard height={400} />
        </View>
      </SafeAreaView>
    );
  }

  if (!doc?.downloadUrl) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar
        title={doc.title}
        subtitle={targetPage ? `Trang ${targetPage}` : undefined}
        onBack={() => router.back()}
      />

      {loadError ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink, textAlign: "center" }}>
            Không thể hiển thị tài liệu
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>{loadError}</Text>
        </View>
      ) : (
        <Pdf
          source={{ uri: doc.downloadUrl, cache: true }}
          page={targetPage}
          style={{ flex: 1, backgroundColor: colors.bg }}
          onError={(error) => setLoadError(String(error))}
          renderActivityIndicator={() => <ActivityIndicator size="large" color={colors.fptOrange} />}
        />
      )}
    </SafeAreaView>
  );
}
