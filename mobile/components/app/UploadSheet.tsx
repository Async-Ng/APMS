import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../constants/colors";
import { useEnrolledCourses } from "../../hooks/useCatalog";
import { useUploadDocument } from "../../hooks/useDocuments";
import { getErrorMessage } from "../../lib/api-error";
import { useToastStore } from "../../stores/toast-store";
import { ActionSheet, type ActionItem } from "./ActionSheet";
import { BrutalButton } from "../ui/BrutalButton";

interface UploadSheetProps {
  visible: boolean;
  folderId?: string | null;
  onDismiss: () => void;
}

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

type Step = "pick" | "uploading" | "done" | "error";

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export function UploadSheet({ visible, folderId, onDismiss }: UploadSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(400)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [courseSlotId, setcourseSlotId] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCoursePicker, setShowCoursePicker] = useState(false);

  const { profile, enrolledCourses, isLoading: profileLoading } = useEnrolledCourses();
  const uploadDocument = useUploadDocument();

  useEffect(() => {
    if (visible) {
      setStep("pick");
      setFile(null);
      setcourseSlotId("");
      setVisibility("private");
      setProgress(0);
      setErrorMsg(null);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_MIME,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const size = asset.size ?? 0;
    if (!asset.mimeType || !ALLOWED_MIME.includes(asset.mimeType)) {
      useToastStore.getState().show("Chỉ chấp nhận tệp PDF, DOCX và PPTX.");
      return;
    }
    if (size > MAX_BYTES) {
      useToastStore.getState().show("Dung lượng tệp không được vượt quá 50 MB.");
      return;
    }
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size });
  }

  async function handleUpload() {
    if (!file || !courseSlotId) return;
    setStep("uploading");
    setProgress(0);
    try {
      await uploadDocument.mutateAsync({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        folderId: folderId ?? null,
        courseSlotId,
        visibility,
        onProgress: setProgress,
      });
      setStep("done");
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Tải lên thất bại. Vui lòng thử lại."));
      setStep("error");
    }
  }

  function handleDismiss() {
    if (step === "uploading") return;
    onDismiss();
  }

  const selectedCourse = enrolledCourses.find((c) => c.id === courseSlotId);
  const canSubmit = Boolean(file && courseSlotId);

  const courseActions: ActionItem[] = enrolledCourses.map((course) => ({
    label: `${course.semester?.code ? `${course.semester.code} · ` : ""}${course.subject?.code ?? ""} — ${course.subject?.name ?? ""}`,
    icon: "book-outline",
    onPress: () => setcourseSlotId(course.id),
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <Pressable style={{ flex: 1 }} onPress={handleDismiss}>
        <Animated.View
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", opacity, justifyContent: "flex-end" }}
        >
          <Pressable>
            <Animated.View
              style={{
                backgroundColor: colors.bg,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderWidth: 3,
                borderBottomWidth: 0,
                borderColor: colors.ink,
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 16,
                maxHeight: "85%",
                transform: [{ translateY }],
              }}
            >
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {(step === "pick" || step === "error") && (
                  <>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, marginTop: 8, marginBottom: 4 }}>
                      Tải lên tài liệu
                    </Text>

                    {profileLoading ? (
                      <ActivityIndicator style={{ marginVertical: 24 }} color={colors.fptOrange} />
                    ) : !profile?.isComplete ? (
                      <View style={{ paddingVertical: 24, gap: 12, alignItems: "center" }}>
                        <Ionicons name="school-outline" size={36} color={colors.fptOrange} />
                        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink, textAlign: "center" }}>
                          Cần hồ sơ học thuật
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                          Mỗi tài liệu phải gắn với một môn học. Hãy cập nhật Chương trình đào tạo trước khi tải lên.
                        </Text>
                        <BrutalButton
                          label="Cập nhật hồ sơ học thuật"
                          onPress={() => {
                            onDismiss();
                            router.push("/profile/academic");
                          }}
                          variant="secondary"
                        />
                      </View>
                    ) : (
                      <View style={{ gap: 14, marginTop: 12 }}>
                        {/* Course selector */}
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 6 }}>
                            Môn học *
                          </Text>
                          <Pressable
                            onPress={() => enrolledCourses.length > 0 && setShowCoursePicker(true)}
                            style={{
                              borderWidth: 2,
                              borderColor: colors.ink,
                              borderRadius: 12,
                              paddingHorizontal: 14,
                              paddingVertical: 12,
                              backgroundColor: colors.surface,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Chọn môn học"
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                color: selectedCourse ? colors.ink : colors.muted,
                                fontWeight: selectedCourse ? "700" : "400",
                                flex: 1,
                              }}
                              numberOfLines={1}
                            >
                              {selectedCourse
                                ? `${selectedCourse.semester?.code ? `${selectedCourse.semester.code} · ` : ""}${selectedCourse.subject?.code} — ${selectedCourse.subject?.name}`
                                : "Chọn môn học…"}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color={colors.muted} />
                          </Pressable>
                          {enrolledCourses.length === 0 && (
                            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                              CTĐT này chưa có môn nào để gắn tài liệu. Liên hệ quản trị viên.
                            </Text>
                          )}
                        </View>

                        {/* Visibility selector */}
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 6 }}>
                            Quyền hiển thị
                          </Text>
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            {(
                              [
                                { value: "private" as const, label: "Riêng tư", hint: "Chỉ bạn và người được chia sẻ" },
                                { value: "public" as const, label: "Công khai", hint: "Mọi sinh viên có thể tìm thấy" },
                              ]
                            ).map((opt) => (
                              <Pressable
                                key={opt.value}
                                onPress={() => setVisibility(opt.value)}
                                style={{
                                  flex: 1,
                                  borderWidth: 2,
                                  borderColor: colors.ink,
                                  borderRadius: 12,
                                  padding: 10,
                                  backgroundColor: visibility === opt.value ? colors.fptOrange : colors.surface,
                                }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: visibility === opt.value }}
                                accessibilityLabel={opt.label}
                              >
                                <Text
                                  style={{
                                    fontSize: 13,
                                    fontWeight: "800",
                                    color: visibility === opt.value ? colors.onBrand : colors.ink,
                                  }}
                                >
                                  {opt.label}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    marginTop: 2,
                                    color: visibility === opt.value ? "rgba(255,255,255,0.85)" : colors.muted,
                                  }}
                                >
                                  {opt.hint}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>

                        {/* File picker */}
                        <Pressable
                          onPress={handlePickFile}
                          style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 14,
                            borderWidth: 3,
                            borderStyle: "dashed",
                            borderColor: colors.ink,
                            borderRadius: 14,
                            padding: 16,
                            backgroundColor: pressed ? colors.bg : colors.surface,
                          })}
                          accessibilityRole="button"
                          accessibilityLabel="Chọn tệp"
                        >
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              borderWidth: 2,
                              borderColor: colors.ink,
                              backgroundColor: colors.fptBlue,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons name="cloud-upload-outline" size={22} color={colors.onBrand} />
                          </View>
                          <View style={{ flex: 1 }}>
                            {file ? (
                              <>
                                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
                                  {file.name}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.muted }}>
                                  {(file.size / 1_048_576).toFixed(2)} MB
                                </Text>
                              </>
                            ) : (
                              <>
                                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>Chọn tệp</Text>
                                <Text style={{ fontSize: 12, color: colors.muted }}>PDF, DOCX, PPTX · tối đa 50 MB</Text>
                              </>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                        </Pressable>

                        {errorMsg && (
                          <Text style={{ fontSize: 13, color: colors.error, fontWeight: "600" }}>{errorMsg}</Text>
                        )}

                        <BrutalButton label="Tải lên" onPress={handleUpload} disabled={!canSubmit} fullWidth />
                      </View>
                    )}
                  </>
                )}

                {step === "uploading" && (
                  <View style={{ paddingVertical: 32, alignItems: "center", gap: 16 }}>
                    <ActivityIndicator size="large" color={colors.fptOrange} />
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.ink }}>Đang tải lên…</Text>
                      <Text style={{ fontSize: 13, color: colors.muted }}>{file?.name}</Text>
                    </View>
                    <View
                      style={{
                        width: "100%",
                        height: 12,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: colors.ink,
                        backgroundColor: colors.bg,
                        overflow: "hidden",
                      }}
                      accessibilityRole="progressbar"
                    >
                      <View style={{ height: "100%", width: `${progress}%`, backgroundColor: colors.fptGreen }} />
                    </View>
                    <Text style={{ fontSize: 13, color: colors.muted }}>{progress}%</Text>
                  </View>
                )}

                {step === "done" && (
                  <View style={{ paddingVertical: 32, alignItems: "center", gap: 12 }}>
                    <Ionicons name="checkmark-circle" size={48} color={colors.fptGreen} />
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.ink }}>Tải lên thành công!</Text>
                      <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                        Tệp đang được xử lý và sẽ sẵn sàng trong giây lát.
                      </Text>
                    </View>
                    <BrutalButton label="Xong" onPress={onDismiss} fullWidth />
                  </View>
                )}
              </ScrollView>

              {(step === "pick" || step === "error") && (
                <View style={{ marginTop: 12 }}>
                  <BrutalButton label="Huỷ" onPress={handleDismiss} variant="ghost" fullWidth />
                </View>
              )}
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Pressable>

      <ActionSheet
        visible={showCoursePicker}
        title="Chọn môn học"
        actions={courseActions}
        onDismiss={() => setShowCoursePicker(false)}
      />
    </Modal>
  );
}
