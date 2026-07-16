import { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../../constants/colors";
import { type Curriculum, type Semester, type Subject } from "../../../hooks/useAdminCatalog";
import { BrutalButton } from "../../ui/BrutalButton";

interface CourseSlotPickerProps {
  visible: boolean;
  curricula: Curriculum[];
  semesters: Semester[];
  subjects: Subject[];
  loading?: boolean;
  submitError?: string | null;
  onConfirm: (values: { curriculumId: string; semesterId: string; subjectIds: string[] }) => void;
  onDismiss: () => void;
}

function PickerPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: colors.ink,
        backgroundColor: active ? colors.fptBlue : colors.surface,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? colors.onBrand : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

export function CourseSlotPicker({
  visible,
  curricula,
  semesters,
  subjects,
  loading = false,
  submitError,
  onConfirm,
  onDismiss,
}: CourseSlotPickerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(600)).current;
  const [curriculumId, setCurriculumId] = useState<string | null>(null);
  const [semesterId, setSemesterId] = useState<string | null>(null);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setCurriculumId(null);
      setSemesterId(null);
      setSubjectIds([]);
      Animated.spring(translateY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: 600, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, translateY]);

  function toggleSubject(id: string) {
    setSubjectIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function handleConfirm() {
    if (!curriculumId || !semesterId || subjectIds.length === 0) return;
    onConfirm({ curriculumId, semesterId, subjectIds });
  }

  const canSubmit = Boolean(curriculumId && semesterId && subjectIds.length > 0);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onDismiss}>
          <Animated.View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
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
            <Pressable>
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
              </View>

              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, marginBottom: 16 }}>
                Gán môn học vào chương trình
              </Text>

              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>
                  CHƯƠNG TRÌNH ĐÀO TẠO
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
                  {curricula.map((c) => (
                    <PickerPill key={c.id} label={c.code} active={curriculumId === c.id} onPress={() => setCurriculumId(c.id)} />
                  ))}
                </View>

                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>
                  HỌC KỲ
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
                  {semesters.map((s) => (
                    <PickerPill key={s.id} label={s.code} active={semesterId === s.id} onPress={() => setSemesterId(s.id)} />
                  ))}
                </View>

                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>
                  MÔN HỌC (chọn nhiều)
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
                  {subjects.map((s) => (
                    <PickerPill key={s.id} label={s.code} active={subjectIds.includes(s.id)} onPress={() => toggleSubject(s.id)} />
                  ))}
                </View>
              </ScrollView>

              {submitError && (
                <Text style={{ color: colors.error, fontSize: 13, marginTop: 8 }}>{submitError}</Text>
              )}

              <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                <BrutalButton label="Huỷ" onPress={onDismiss} variant="ghost" style={{ flex: 1 }} />
                <BrutalButton
                  label={`Gán (${subjectIds.length})`}
                  onPress={handleConfirm}
                  variant="primary"
                  loading={loading}
                  disabled={!canSubmit}
                  style={{ flex: 1 }}
                />
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
