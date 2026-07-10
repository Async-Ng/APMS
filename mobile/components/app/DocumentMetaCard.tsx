import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { type DocumentDetail } from "../../hooks/useDocuments";
import { brutalCardStyle } from "../../lib/brutal-style";
import { StatusBadge } from "../ui/StatusBadge";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getMimeLabel(mimeType: string): string {
  if (mimeType.includes("pdf")) return "Tài liệu PDF";
  if (mimeType.includes("word") || mimeType.includes("document")) return "Tài liệu Word";
  if (mimeType.includes("presentation")) return "PowerPoint";
  return "Tài liệu";
}

function getMimeIcon(mimeType: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
  if (mimeType.includes("pdf")) return { name: "document-text", color: "#E53E3E" };
  if (mimeType.includes("word") || mimeType.includes("document")) return { name: "document", color: colors.fptBlue };
  if (mimeType.includes("presentation")) return { name: "easel", color: colors.fptOrange };
  return { name: "document-outline", color: colors.muted };
}

export function DocumentMetaCard({ doc }: { doc: DocumentDetail }) {
  const fileIcon = getMimeIcon(doc.mimeType);

  return (
    <>
      {/* Hero card */}
      <View style={{ ...brutalCardStyle, backgroundColor: fileIcon.color, padding: 24, alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            borderWidth: 3,
            borderColor: colors.ink,
            backgroundColor: "rgba(255,255,255,0.25)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={fileIcon.name} size={44} color={colors.onBrand} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.onBrand, textAlign: "center" }}>{doc.title}</Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{getMimeLabel(doc.mimeType)}</Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <StatusBadge status={doc.status} createdAt={doc.createdAt} />
          {doc.isStarred && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="star" size={14} color="#FCD34D" />
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: "700" }}>Đã gắn sao</Text>
            </View>
          )}
        </View>
      </View>

      {/* Metadata */}
      <View style={{ ...brutalCardStyle, padding: 16, gap: 0 }}>
        {[
          { label: "Tên tệp", value: doc.originalFilename },
          { label: "Dung lượng", value: formatBytes(doc.fileSizeBytes) },
          { label: "Số trang", value: doc.pageCount !== null ? String(doc.pageCount) : "—" },
          { label: "Tải lên", value: new Date(doc.createdAt).toLocaleDateString() },
          { label: "Cập nhật lần cuối", value: new Date(doc.updatedAt).toLocaleDateString() },
        ].map((row, idx, arr) => (
          <View
            key={row.label}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 12,
              borderBottomWidth: idx < arr.length - 1 ? 1.5 : 0,
              borderBottomColor: "#E5E5E5",
            }}
          >
            <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "600" }}>{row.label}</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink, maxWidth: "60%", textAlign: "right" }} numberOfLines={1}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Tags */}
      {doc.tags.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted }}>THẺ</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {doc.tags.map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  shadowColor: colors.ink,
                  shadowOffset: { width: 2, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Processing status info */}
      {doc.status !== "ready" && (
        <View
          style={{
            backgroundColor: doc.status === "failed" ? "#FEE2E2" : "#DBEAFE",
            borderWidth: 2,
            borderColor: colors.ink,
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Ionicons
            name={doc.status === "failed" ? "warning-outline" : "time-outline"}
            size={18}
            color={doc.status === "failed" ? colors.error : colors.fptBlue}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: doc.status === "failed" ? colors.error : colors.fptBlue }}>
              {doc.status === "failed" ? "Xử lý thất bại" : doc.status === "processing" ? "Đang xử lý…" : "Chờ xử lý"}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              {doc.status === "failed"
                ? "Không thể xử lý tài liệu này. Hãy thử tải lên lại."
                : "Tài liệu đang được lập chỉ mục cho tìm kiếm ngữ nghĩa và trò chuyện AI."}
            </Text>
          </View>
        </View>
      )}
    </>
  );
}
