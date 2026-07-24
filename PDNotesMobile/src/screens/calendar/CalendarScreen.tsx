import { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { dayRatingEmoji } from "../../components/DayRatingPicker";
import { useAppStore } from "../../store/useAppStore";
import { appointmentsForDate } from "../../store/selectors";
import { toDateKey, todayKey } from "../../utils/dateKey";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const cells: (string | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toDateKey(new Date(year, month, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarScreen() {
  const navigation = useNavigation<any>();
  const dayStatuses = useAppStore((s) => s.dayStatuses);
  const appointments = useAppStore((s) => s.appointments);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const cells = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const today = todayKey();

  function changeMonth(delta: number) {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function handleDayPress(date: string) {
    Alert.alert(date, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Medications", onPress: () => navigation.navigate("DayMedication", { date }) },
      { text: "Appointments", onPress: () => navigation.navigate("DayAppointment", { date }) },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.monthNav}>
        <Pressable onPress={() => changeMonth(-1)}>
          <Text style={styles.navButton}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={() => changeMonth(1)}>
          <Text style={styles.navButton}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={i} style={styles.cell} />;
          const status = dayStatuses[date];
          const hasAppointments = appointmentsForDate(appointments, date).length > 0;
          const dayNumber = Number(date.split("-")[2]);
          return (
            <Pressable key={i} style={[styles.cell, date === today && styles.cellToday]} onPress={() => handleDayPress(date)}>
              <Text style={styles.dayNumber}>{dayNumber}</Text>
              {status && <Text style={styles.emoji}>{dayRatingEmoji(status.rating)}</Text>}
              {hasAppointments && <View style={styles.appointmentDot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 12 },
  monthNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  navButton: { fontSize: 22, color: "#2563EB", paddingHorizontal: 16 },
  monthLabel: { fontSize: 17, fontWeight: "700" },
  weekdayRow: { flexDirection: "row" },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "#F3F4F6",
  },
  cellToday: { backgroundColor: "#EEF4FF" },
  dayNumber: { fontSize: 13 },
  emoji: { fontSize: 14 },
  appointmentDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#2563EB", marginTop: 2 },
});
