import { useState } from "react";
import { Alert, RefreshControl, SectionList, StyleSheet, Text, View, Pressable } from "react-native";
import type { MedicationSchedule } from "@pd-notes/shared";
import { useAppStore } from "../../store/useAppStore";
import { activeSchedules, pastSchedules } from "../../store/selectors";
import { generateId } from "../../utils/uuid";
import { MedicationForm } from "./MedicationForm";

export function MedicationsScreen() {
  const schedules = useAppStore((s) => s.medicationSchedules);
  const isSyncing = useAppStore((s) => s.isSyncing);
  const loadSync = useAppStore((s) => s.loadSync);
  const addOrUpdateSchedule = useAppStore((s) => s.addOrUpdateSchedule);
  const deleteSchedule = useAppStore((s) => s.deleteSchedule);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<MedicationSchedule | null>(null);

  const sections = [
    { title: "Active", data: activeSchedules(schedules) },
    { title: "Past", data: pastSchedules(schedules) },
  ].filter((s) => s.data.length > 0);

  function openNew() {
    setEditing(null);
    setFormVisible(true);
  }

  function openEdit(schedule: MedicationSchedule) {
    setEditing(schedule);
    setFormVisible(true);
  }

  function handleSave(form: Omit<MedicationSchedule, "id">) {
    const schedule: MedicationSchedule = { id: editing?.id ?? generateId(), ...form };
    addOrUpdateSchedule(schedule).catch(() => Alert.alert("Couldn't save medication"));
    setFormVisible(false);
  }

  function handleDelete(schedule: MedicationSchedule) {
    Alert.alert("Delete medication?", schedule.name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteSchedule(schedule.id).catch(() => Alert.alert("Couldn't delete medication")),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={loadSync} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No medications yet{"\n"}Add one below to start tracking.</Text>
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.subtitle}>
              {[item.dose, item.timing].filter(Boolean).join(" · ")}
            </Text>
            <Text style={styles.dates}>
              {item.startDate} {item.endDate ? `– ${item.endDate}` : "– ongoing"}
            </Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.addButton} onPress={openNew}>
        <Text style={styles.addButtonText}>+ Add Medication</Text>
      </Pressable>

      <MedicationForm
        key={editing?.id ?? "new"}
        visible={formVisible}
        initial={editing}
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
  sectionHeader: { fontSize: 13, fontWeight: "700", color: "#6B7280", marginTop: 12, marginBottom: 6 },
  row: { padding: 14, borderRadius: 10, backgroundColor: "#F2F2F7", marginBottom: 8 },
  name: { fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  dates: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  addButton: {
    margin: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "700" },
});
