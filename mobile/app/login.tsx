import { signInWithRedirect } from "aws-amplify/auth";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function LoginScreen() {
  async function handleGoogleSignIn() {
    await signInWithRedirect({ provider: "Google" });
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#f9fafb",
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 400,
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 24,
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 8 }}>Sign in to APMS</Text>
        <Text style={{ fontSize: 14, color: "#4b5563", marginBottom: 24 }}>
          Use your Google account to access your academic documents.
        </Text>
        <Pressable
          onPress={() => void handleGoogleSignIn()}
          style={{
            backgroundColor: "#111827",
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Continue with Google</Text>
        </Pressable>
        <Link href="/" style={{ marginTop: 16, textAlign: "center", color: "#6b7280" }}>
          Back to home
        </Link>
      </View>
    </View>
  );
}
