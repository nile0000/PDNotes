import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Contact } from "@pd-notes/shared";

interface Props {
  visible: boolean;
  initial: Contact | null;
  onCancel: () => void;
  onSave: (contact: Omit<Contact, "id">) => void;
  onImportFromDevice: () => void;
}

const emptyForm = { name: "", role: "", phone: "", email: "", address: "", notes: "" };

export function ContactForm({ visible, initial, onCancel, onSave, onImportFromDevice }: Props) {
  const [form, setForm] = useState(initial ?? emptyForm);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{initial?.id ? "Edit Contact" : "New Contact"}</Text>

        {!initial?.id && (
          <Pressable style={styles.importButton} onPress={onImportFromDevice}>
            <Text style={styles.importButtonText}>Import from Contacts</Text>
          </Pressable>
        )}

        <Field label="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <Field label="Role" value={form.role} onChangeText={(v) => setForm({ ...form, role: v })} placeholder="e.g. Neurologist" />
        <Field label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
        <Field label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} multiline />
        <Field label="Notes" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline />

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

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "sentences";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.multiline && styles.inputMultiline]}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        multiline={props.multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingTop: 60, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  importButton: {
    backgroundColor: "#EEF4FF",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  importButtonText: { color: "#2563EB", fontWeight: "600" },
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
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelButton: { flex: 1, padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: "#F2F2F7" },
  cancelButtonText: { fontWeight: "600" },
  saveButton: { flex: 1, padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: "#2563EB" },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#fff", fontWeight: "700" },
});
