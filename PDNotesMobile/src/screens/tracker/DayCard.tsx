import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { SymptomCategory } from "@pd-notes/shared";
import { symptomCategories } from "@pd-notes/shared";
import { DayRatingPicker } from "../../components/DayRatingPicker";
import { SeverityRatingView } from "../../components/SeverityRatingView";
import { useAppStore } from "../../store/useAppStore";
import { appointmentsForDate, daySymptomsHasContent, schedulesForDate } from "../../store/selectors";

const CATEGORY_LABELS: Record<SymptomCategory, string> = {
  tremors: "Tremors",
  legs: "Legs",
  plumbing: "Plumbing",
  neuropathy: "Neuropathy",
  sleep: "Sleep",
  diet: "Diet",
  pain: "Pain",
};

export function DayCard({ date }: { date: string }) {
  const navigation = useNavigation<any>();
  const status = useAppStore((s) => s.dayStatuses[date]);
  const symptoms = useAppStore((s) => s.daySymptoms[date]);
  const schedules = useAppStore((s) => s.medicationSchedules);
  const appointments = useAppStore((s) => s.appointments);
  const updateStatus = useAppStore((s) => s.updateStatus);
  const updateSymptoms = useAppStore((s) => s.updateSymptoms);

  const [symptomsExpanded, setSymptomsExpanded] = useState(false);

  const rating = status?.rating ?? "NORMAL";
  const note = status?.note ?? "";
  const exercise = status?.exercise ?? "";
  const medCount = schedulesForDate(schedules, date).length;
  const apptCount = appointmentsForDate(appointments, date).length;
  const hasSymptoms = daySymptomsHasContent(symptoms);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.dateLabel}>{date}</Text>
        <DayRatingPicker value={rating} onChange={(v) => updateStatus(date, (s) => ({ ...s, rating: v }))} />
      </View>

      <View style={styles.linkRow}>
        <Pressable style={styles.linkChip} onPress={() => navigation.navigate("DayMedication", { date })}>
          <Text style={styles.linkChipText}>💊 {medCount} medication{medCount === 1 ? "" : "s"}</Text>
        </Pressable>
        <Pressable style={styles.linkChip} onPress={() => navigation.navigate("DayAppointment", { date })}>
          <Text style={styles.linkChipText}>📅 {apptCount} appointment{apptCount === 1 ? "" : "s"}</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Note"
        value={note}
        onChangeText={(v) => updateStatus(date, (s) => ({ ...s, note: v }))}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Exercise"
        value={exercise}
        onChangeText={(v) => updateStatus(date, (s) => ({ ...s, exercise: v }))}
      />

      <Pressable onPress={() => setSymptomsExpanded(!symptomsExpanded)}>
        <Text style={styles.symptomsToggle}>
          {symptomsExpanded ? "▲" : "▼"} Symptoms {hasSymptoms ? "•" : ""}
        </Text>
      </Pressable>

      {symptomsExpanded && (
        <View style={styles.symptomsSection}>
          {symptomCategories.map((category) => {
            const noteKey = category;
            const severityKey = `${category}Severity` as const;
            const noteValue = symptoms?.[noteKey] ?? "";
            const severityValue = symptoms?.[severityKey] ?? 0;
            return (
              <View key={category} style={styles.symptomRow}>
                <Text style={styles.symptomLabel}>{CATEGORY_LABELS[category]}</Text>
                <SeverityRatingView
                  value={severityValue}
                  onChange={(v) =>
                    updateSymptoms(date, (s) => ({ ...s, [severityKey]: v }))
                  }
                />
                <TextInput
                  style={styles.symptomInput}
                  placeholder="Note"
                  value={noteValue}
                  onChangeText={(v) => updateSymptoms(date, (s) => ({ ...s, [noteKey]: v }))}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 14, marginBottom: 12, gap: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateLabel: { fontSize: 15, fontWeight: "700" },
  linkRow: { flexDirection: "row", gap: 8 },
  linkChip: { backgroundColor: "#EEF4FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  linkChipText: { fontSize: 12, color: "#2563EB", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  symptomsToggle: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  symptomsSection: { gap: 10, paddingTop: 4 },
  symptomRow: { gap: 6 },
  symptomLabel: { fontSize: 13, fontWeight: "600" },
  symptomInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: "#fff",
  },
});
