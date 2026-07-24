import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppStore } from "../store/useAppStore";

const AUTO_DISMISS_MS = 5000;

export function ErrorBanner() {
  const message = useAppStore((s) => s.lastError);
  const clearError = useAppStore((s) => s.clearError);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clearError, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, clearError]);

  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
      <Pressable onPress={clearError} hitSlop={8}>
        <Text style={styles.dismiss}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEE2E2",
    borderBottomWidth: 1,
    borderBottomColor: "#FCA5A5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  text: { flex: 1, color: "#991B1B", fontSize: 13, fontWeight: "600" },
  dismiss: { color: "#991B1B", fontSize: 16, fontWeight: "700", paddingHorizontal: 4 },
});
