import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ErrorBanner } from "../components/ErrorBanner";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { SignUpScreen } from "../screens/auth/SignUpScreen";
import { AppTabs } from "./AppTabs";

export function RootNavigator() {
  const session = useAuthStore((s) => s.session);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const initialize = useAuthStore((s) => s.initialize);
  const isLoaded = useAppStore((s) => s.isLoaded);
  const isSyncing = useAppStore((s) => s.isSyncing);
  const loadSync = useAppStore((s) => s.loadSync);
  const reset = useAppStore((s) => s.reset);
  const [authScreen, setAuthScreen] = useState<"login" | "signup">("login");

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  useEffect(() => {
    if (session) {
      loadSync();
    } else {
      reset();
    }
  }, [session, loadSync, reset]);

  if (isAuthLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return authScreen === "login" ? (
      <LoginScreen onNavigateToSignUp={() => setAuthScreen("signup")} />
    ) : (
      <SignUpScreen onNavigateToLogin={() => setAuthScreen("login")} />
    );
  }

  if (isSyncing && !isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading your data…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ErrorBanner />
      <View style={styles.container}>
        <NavigationContainer>
          <AppTabs />
        </NavigationContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#6B7280" },
});
