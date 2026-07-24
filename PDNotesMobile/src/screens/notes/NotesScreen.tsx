import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";
import { dayRatingEmoji } from "../../components/DayRatingPicker";
import { severityDisplay } from "../../components/severity";
import { useAppStore } from "../../store/useAppStore";
import { notesDays } from "../../store/selectors";
import { symptomCategories } from "@pd-notes/shared";

export function NotesScreen() {
  const dayStatuses = useAppStore((s) => s.dayStatuses);
  const daySymptoms = useAppStore((s) => s.daySymptoms);
  const isSyncing = useAppStore((s) => s.isSyncing);
  const loadSync = useAppStore((s) => s.loadSync);
  const updateStatus = useAppStore((s) => s.updateStatus);
  const markAllNotesRead = useAppStore((s) => s.markAllNotesRead);

  const [showRead, setShowRead] = useState(true);
  const [badDaysOnly, setBadDaysOnly] = useState(false);

  const dates = useMemo(() => notesDays(dayStatuses, daySymptoms), [dayStatuses, daySymptoms]);

  const filtered = dates.filter((date) => {
    const status = dayStatuses[date];
    if (!showRead && status?.isRead) return false;
    if (badDaysOnly && status?.rating !== "BAD") return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Show read</Text>
          <Switch value={showRead} onValueChange={setShowRead} />
        </View>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Bad days only</Text>
          <Switch value={badDaysOnly} onValueChange={setBadDaysOnly} />
        </View>
      </View>

      <Pressable
        style={styles.markAllButton}
        onPress={() => markAllNotesRead().catch(() => Alert.alert("Couldn't update"))}
      >
        <Text style={styles.markAllButtonText}>Mark All Read</Text>
      </Pressable>

      <FlatList
        data={filtered}
        keyExtractor={(d) => d}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={loadSync} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {dates.length === 0
              ? "No notes yet\nDaily notes, exercise, and symptoms will show up here."
              : "No days match these filters"}
          </Text>
        }
        renderItem={({ item: date }) => {
          const status = dayStatuses[date];
          const symptoms = daySymptoms[date];
          const symptomLines = symptomCategories
            .filter((c) => (symptoms?.[`${c}Severity`] ?? 0) > 0 || symptoms?.[c])
            .map((c) => `${c}: ${severityDisplay(symptoms?.[`${c}Severity`] ?? 0)}`);

          return (
            <Pressable
              style={[styles.row, !status?.isRead && styles.rowUnread]}
              onPress={() => updateStatus(date, (s) => ({ ...s, isRead: !s.isRead }))}
            >
              <View style={styles.rowHeader}>
                <Text style={styles.dateLabel}>{date}</Text>
                <Text>{dayRatingEmoji(status?.rating ?? "NORMAL")}</Text>
              </View>
              {!!status?.note && <Text style={styles.note}>{status.note}</Text>}
              {!!status?.exercise && <Text style={styles.exercise}>Exercise: {status.exercise}</Text>}
              {symptomLines.map((line) => (
                <Text key={line} style={styles.symptomLine}>
                  {line}
                </Text>
              ))}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  filterRow: { flexDirection: "row", padding: 16, gap: 24 },
  filterItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterLabel: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  markAllButton: { marginHorizontal: 16, marginBottom: 8, alignSelf: "flex-start" },
  markAllButtonText: { color: "#2563EB", fontWeight: "600" },
  list: { padding: 16, paddingTop: 0, gap: 8 },
  empty: { textAlign: "center", color: "#8E8E93", marginTop: 40 },
  row: { padding: 14, borderRadius: 10, backgroundColor: "#F2F2F7", marginBottom: 8, gap: 4 },
  rowUnread: { backgroundColor: "#EEF4FF" },
  rowHeader: { flexDirection: "row", justifyContent: "space-between" },
  dateLabel: { fontWeight: "700" },
  note: { fontSize: 14 },
  exercise: { fontSize: 13, color: "#6B7280" },
  symptomLine: { fontSize: 12, color: "#6B7280" },
});
