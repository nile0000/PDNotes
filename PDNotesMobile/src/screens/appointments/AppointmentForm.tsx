import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Appointment, Contact } from "@pd-notes/shared";
import { formatTimeAmPm } from "../../utils/dateKey";

interface Props {
  visible: boolean;
  date: string;
  initial: Appointment | null;
  contacts: Contact[];
  onCancel: () => void;
  onSave: (appointment: Omit<Appointment, "id" | "date">) => void;
}

function timeToDate(time: string): Date {
  const base = new Date();
  if (!time) {
    base.setHours(9, 0, 0, 0);
    return base;
  }
  const [h, m] = time.split(":").map(Number);
  base.setHours(h, m, 0, 0);
  return base;
}

function dateToTime(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AppointmentForm({ visible, date, initial, contacts, onCancel, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [contactId, setContactId] = useState<string | null>(initial?.contactId ?? null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{initial ? "Edit Appointment" : "New Appointment"}</Text>
        <Text style={styles.dateLabel}>{date}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Time</Text>
          <Pressable style={styles.input} onPress={() => setShowTimePicker(true)}>
            <Text>{time ? formatTimeAmPm(time) : "Not set"}</Text>
          </Pressable>
          {showTimePicker && (
            <DateTimePicker
              value={timeToDate(time)}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selected) => {
                setShowTimePicker(Platform.OS === "ios");
                if (event.type === "set" && selected) setTime(dateToTime(selected));
              }}
            />
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contact</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactRow}>
            {contacts.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setContactId(contactId === c.id ? null : c.id)}
                style={[styles.contactChip, contactId === c.id && styles.contactChipSelected]}
              >
                <Text style={[styles.contactChipText, contactId === c.id && styles.contactChipTextSelected]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.inputMultiline]} value={notes} onChangeText={setNotes} multiline />
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]}
            disabled={!title.trim()}
            onPress={() => onSave({ title, time, location, notes, contactId })}
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
  title: { fontSize: 22, fontWeight: "700" },
  dateLabel: { fontSize: 14, color: "#6B7280", marginBottom: 8 },
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
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  contactRow: { flexDirection: "row" },
  contactChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
    marginRight: 8,
  },
  contactChipSelected: { backgroundColor: "#2563EB" },
  contactChipText: { fontWeight: "600", color: "#111827" },
  contactChipTextSelected: { color: "#fff" },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelButton: { flex: 1, padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: "#F2F2F7" },
  cancelButtonText: { fontWeight: "600" },
  saveButton: { flex: 1, padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: "#2563EB" },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#fff", fontWeight: "700" },
});
