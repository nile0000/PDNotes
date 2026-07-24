import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { addDays, fromDateKey, todayKey } from "../../utils/dateKey";
import { DayCard } from "./DayCard";

function startOfWeek(date: string): string {
  const d = fromDateKey(date);
  const day = d.getDay(); // 0 = Sunday
  return addDays(date, -day);
}

export function TrackerScreen() {
  const isSyncing = useAppStore((s) => s.isSyncing);
  const loadSync = useAppStore((s) => s.loadSync);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayKey()));

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekLabel = `${weekStart} – ${days[6]}`;

  return (
    <View style={styles.container}>
      <View style={styles.weekNav}>
        <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))}>
          <Text style={styles.navButton}>‹ Prev</Text>
        </Pressable>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))}>
          <Text style={styles.navButton}>Next ›</Text>
        </Pressable>
      </View>

      <FlatList
        data={days}
        keyExtractor={(d) => d}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={loadSync} />}
        renderItem={({ item }) => <DayCard date={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  weekNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  navButton: { color: "#2563EB", fontWeight: "600" },
  weekLabel: { fontWeight: "600" },
  list: { padding: 16 },
});
