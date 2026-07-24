import { useState } from "react";
import { useRoute } from "@react-navigation/native";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { Appointment } from "@pd-notes/shared";
import { useAppStore } from "../../store/useAppStore";
import { appointmentsForDate } from "../../store/selectors";
import { formatTimeAmPm } from "../../utils/dateKey";
import { generateId } from "../../utils/uuid";
import { AppointmentForm } from "./AppointmentForm";

export function DayAppointmentScreen() {
  const route = useRoute<any>();
  const date: string = route.params.date;

  const appointments = useAppStore((s) => s.appointments);
  const contacts = useAppStore((s) => s.contacts);
  const addOrUpdateAppointment = useAppStore((s) => s.addOrUpdateAppointment);
  const deleteAppointment = useAppStore((s) => s.deleteAppointment);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const dayAppointments = appointmentsForDate(appointments, date);

  function contactName(id: string | null) {
    if (!id) return null;
    return contacts.find((c) => c.id === id)?.name ?? null;
  }

  function handleSave(form: Omit<Appointment, "id" | "date">) {
    const appointment: Appointment = { id: editing?.id ?? generateId(), date, ...form };
    addOrUpdateAppointment(appointment).catch(() => Alert.alert("Couldn't save appointment"));
    setFormVisible(false);
  }

  function handleDelete(appointment: Appointment) {
    Alert.alert("Delete appointment?", appointment.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteAppointment(appointment.id).catch(() => Alert.alert("Couldn't delete appointment")),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={dayAppointments}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No appointments on {date}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => {
              setEditing(item);
              setFormVisible(true);
            }}
            onLongPress={() => handleDelete(item)}
          >
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.subtitle}>
              {[formatTimeAmPm(item.time), item.location].filter(Boolean).join(" · ")}
            </Text>
            {contactName(item.contactId) && (
              <Text style={styles.subtitle}>{contactName(item.contactId)}</Text>
            )}
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
        <Text style={styles.addButtonText}>+ Add Appointment</Text>
      </Pressable>

      <AppointmentForm
        key={editing?.id ?? "new"}
        visible={formVisible}
        date={date}
        initial={editing}
        contacts={contacts}
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
  rowTitle: { fontSize: 16, fontWeight: "600" },
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
