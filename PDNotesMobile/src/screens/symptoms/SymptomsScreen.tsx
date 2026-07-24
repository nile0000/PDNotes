import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { symptomCategories, type SymptomCategory } from "@pd-notes/shared";
import { severityColor, severityDisplay } from "../../components/severity";
import { useAppStore } from "../../store/useAppStore";
import { daySymptomsHasContent } from "../../store/selectors";

const CATEGORY_LABELS: Record<SymptomCategory, string> = {
  tremors: "Tremors",
  legs: "Legs",
  plumbing: "Plumbing",
  neuropathy: "Neuropathy",
  sleep: "Sleep",
  diet: "Diet",
  pain: "Pain",
};

export function SymptomsScreen() {
  const daySymptoms = useAppStore((s) => s.daySymptoms);
  const isSyncing = useAppStore((s) => s.isSyncing);
  const loadSync = useAppStore((s) => s.loadSync);

  const dates = useMemo(
    () =>
      Object.values(daySymptoms)
        .filter(daySymptomsHasContent)
        .map((s) => s.date)
        .sort((a, b) => b.localeCompare(a)),
    [daySymptoms]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={dates}
        keyExtractor={(d) => d}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={loadSync} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No symptoms logged yet{"\n"}Log symptoms from the Tracker tab.
          </Text>
        }
        renderItem={({ item: date }) => {
          const symptoms = daySymptoms[date];
          const entries = symptomCategories.filter((c) => {
            const note = symptoms[c];
            const severity = symptoms[`${c}Severity`];
            return note !== "" || severity > 0;
          });
          return (
            <View style={styles.card}>
              <Text style={styles.dateLabel}>{date}</Text>
              {entries.map((c) => {
                const severity = symptoms[`${c}Severity`];
                const note = symptoms[c];
                return (
                  <View key={c} style={styles.entryRow}>
                    <View style={[styles.dot, { backgroundColor: severityColor(severity) }]} />
                    <Text style={styles.entryLabel}>{CATEGORY_LABELS[c]}</Text>
                    {severity > 0 && <Text style={styles.entrySeverity}>{severityDisplay(severity)}</Text>}
                    {!!note && <Text style={styles.entryNote}>{note}</Text>}
                  </View>
                );
              })}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  list: { padding: 16, gap: 8 },
  empty: { textAlign: "center", color: "#8E8E93", marginTop: 40 },
  card: { padding: 14, borderRadius: 10, backgroundColor: "#F2F2F7", marginBottom: 8, gap: 6 },
  dateLabel: { fontWeight: "700", marginBottom: 4 },
  entryRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  entryLabel: { fontWeight: "600", fontSize: 13 },
  entrySeverity: { fontSize: 13, color: "#6B7280" },
  entryNote: { fontSize: 13, color: "#6B7280", flexShrink: 1 },
});
