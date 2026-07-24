import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuthStore } from "../../store/useAuthStore";

export function SignUpScreen({ onNavigateToLogin }: { onNavigateToLogin: () => void }) {
  const signUp = useAuthStore((s) => s.signUp);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didSubmit, setDidSubmit] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    const message = await signUp(email.trim(), password);
    setIsSubmitting(false);
    if (message) {
      setError(message);
    } else {
      setDidSubmit(true);
    }
  }

  if (didSubmit) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to {email}. Confirm it, then log in.
        </Text>
        <Pressable onPress={onNavigateToLogin}>
          <Text style={styles.link}>Back to log in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 characters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        disabled={isSubmitting || !email || password.length < 6}
        onPress={handleSubmit}
      >
        <Text style={styles.buttonText}>{isSubmitting ? "Signing up…" : "Sign Up"}</Text>
      </Pressable>

      <Pressable onPress={onNavigateToLogin}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { color: "#DC2626", fontSize: 14 },
  button: { backgroundColor: "#2563EB", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { textAlign: "center", color: "#2563EB", marginTop: 16 },
});
