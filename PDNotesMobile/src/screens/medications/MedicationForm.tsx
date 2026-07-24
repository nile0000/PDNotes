import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { MedicationSchedule } from "@pd-notes/shared";
import { DateField } from "../../components/DateField";
import { todayKey } from "../../utils/dateKey";

const TIMINGS = ["Day", "Afternoon", "Night"];

interface Props {
  visible: boolean;
  initial: MedicationSchedule | null;
  defaultStartDate?: string;
  onCancel: () => void;
  onSave: (schedule: Omit<MedicationSchedule, "id">) => void;
}

export function MedicationForm({ visible, initial, defaultStartDate, onCancel, onSave }: Props) {
  const [form, setForm] = useState(
    initial ?? {
      name: "",
      dose: "",
      timing: "Day",
      purpose: "",
      startDate: defaultStartDate ?? todayKey(),
      endDate: null as string | null,
    }
  );
  const isOngoing = form.endDate === null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{initial ? "Edit Medication" : "New Medication"}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Dose</Text>
          <TextInput style={styles.input} value={form.dose} onChangeText={(v) => setForm({ ...form, dose: v })} placeholder="e.g. 100mg" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Timing</Text>
          <View style={styles.row}>
            {TIMINGS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setForm({ ...form, timing: t })}
                style={[styles.timingChip, form.timing === t && styles.timingChipSelected]}
              >
                <Text style={[styles.timingChipText, form.timing === t && styles.timingChipTextSelected]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Purpose</Text>
          <TextInput style={styles.input} value={form.purpose} onChangeText={(v) => setForm({ ...form, purpose: v })} />
        </View>

        <DateField label="Start Date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />

        <View style={styles.field}>
          <View style={styles.ongoingRow}>
            <Text style={styles.label}>Ongoing (no end date)</Text>
            <Switch
              value={isOngoing}
              onValueChange={(value) => setForm({ ...form, endDate: value ? null : todayKey() })}
            />
          </View>
          {!isOngoing && (
            <DateField
              label="End Date"
              value={form.endDate ?? todayKey()}
              onChange={(v) => setForm({ ...form, endDate: v })}
            />
          )}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, !form.name.trim() && styles.saveButtonDisabled]}
            disabled={!form.name.trim()}
            onPress={() => onSave(form)}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingTop: 60, gap: 14 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  field: { gap: 4 },
  label: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 8 },
  timingChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
  },
  timingChipSelected: { backgroundColor: "#2563EB" },
  timingChipText: { fontWeight: "600", color: "#111827" },
  timingChipTextSelected: { color: "#fff" },
  ongoingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelButton: { flex: 1, padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: "#F2F2F7" },
  cancelButtonText: { fontWeight: "600" },
  saveButton: { flex: 1, padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: "#2563EB" },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#fff", fontWeight: "700" },
});
