import { useState } from "react";
import { useRoute } from "@react-navigation/native";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { MedicationSchedule } from "@pd-notes/shared";
import { useAppStore } from "../../store/useAppStore";
import { schedulesForDate } from "../../store/selectors";
import { generateId } from "../../utils/uuid";
import { MedicationForm } from "./MedicationForm";

export function DayMedicationScreen() {
  const route = useRoute<any>();
  const date: string = route.params.date;

  const schedules = useAppStore((s) => s.medicationSchedules);
  const addOrUpdateSchedule = useAppStore((s) => s.addOrUpdateSchedule);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<MedicationSchedule | null>(null);

  const dayMeds = schedulesForDate(schedules, date);

  function handleSave(form: Omit<MedicationSchedule, "id">) {
    const schedule: MedicationSchedule = { id: editing?.id ?? generateId(), ...form };
    addOrUpdateSchedule(schedule).catch(() => Alert.alert("Couldn't save medication"));
    setFormVisible(false);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={dayMeds}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No medications active on {date}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => {
              setEditing(item);
              setFormVisible(true);
            }}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.subtitle}>{[item.dose, item.timing].filter(Boolean).join(" · ")}</Text>
          </Pressable>
        )}
      />
      <Pressable
        style={styles.addButton}
        onPress={() => {
          setEditing(null);
          setFormVisible(true);
        }}
      >
        <Text style={styles.addButtonText}>+ Add Medication</Text>
      </Pressable>

      <MedicationForm
        key={editing?.id ?? "new"}
        visible={formVisible}
        initial={editing}
        defaultStartDate={date}
        onCancel={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  list: { padding: 16, gap: 8 },
  empty: { textAlign: "center", color: "#8E8E93", marginTop: 40 },
  row: { padding: 14, borderRadius: 10, backgroundColor: "#F2F2F7", marginBottom: 8 },
  name: { fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  addButton: {
    margin: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "700" },
});
