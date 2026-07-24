import { useState } from "react";
import * as Contacts from "expo-contacts";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { Contact } from "@pd-notes/shared";
import { useAppStore } from "../../store/useAppStore";
import { generateId } from "../../utils/uuid";
import { ContactForm } from "./ContactForm";

export function ContactsScreen() {
  const contacts = useAppStore((s) => s.contacts);
  const isSyncing = useAppStore((s) => s.isSyncing);
  const loadSync = useAppStore((s) => s.loadSync);
  const addOrUpdateContact = useAppStore((s) => s.addOrUpdateContact);
  const deleteContact = useAppStore((s) => s.deleteContact);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [pendingImport, setPendingImport] = useState<Partial<Contact> | null>(null);

  const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name));

  function openNew() {
    setEditing(null);
    setPendingImport(null);
    setFormVisible(true);
  }

  function openEdit(contact: Contact) {
    setEditing(contact);
    setPendingImport(null);
    setFormVisible(true);
  }

  async function handleImport() {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow contacts access to import a contact.");
      return;
    }
    const picked = await Contacts.presentContactPickerAsync();
    if (!picked) return;

    setPendingImport({
      name: picked.name ?? "",
      phone: picked.phoneNumbers?.[0]?.number ?? "",
      email: picked.emails?.[0]?.email ?? "",
      address: picked.addresses?.[0]
        ? [picked.addresses[0].street, picked.addresses[0].city, picked.addresses[0].region]
            .filter(Boolean)
            .join(", ")
        : "",
    });
  }

  function handleSave(form: Omit<Contact, "id">) {
    const contact: Contact = { id: editing?.id ?? generateId(), ...form };
    addOrUpdateContact(contact).catch(() => Alert.alert("Couldn't save contact"));
    setFormVisible(false);
  }

  function handleDelete(contact: Contact) {
    Alert.alert("Delete contact?", contact.name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteContact(contact.id).catch(() => Alert.alert("Couldn't delete contact")),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={loadSync} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No contacts yet{"\n"}Add your doctors, therapists, or caregivers below.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)}>
            <Text style={styles.name}>{item.name}</Text>
            {!!item.role && <Text style={styles.subtitle}>{item.role}</Text>}
            {!!item.phone && <Text style={styles.subtitle}>{item.phone}</Text>}
          </Pressable>
        )}
      />
      <Pressable style={styles.addButton} onPress={openNew}>
        <Text style={styles.addButtonText}>+ Add Contact</Text>
      </Pressable>

      <ContactForm
        key={editing?.id ?? (pendingImport ? "import" : "new")}
        visible={formVisible}
        initial={
          pendingImport
            ? {
                id: "",
                name: pendingImport.name ?? "",
                role: "",
                phone: pendingImport.phone ?? "",
                email: pendingImport.email ?? "",
                address: pendingImport.address ?? "",
                notes: "",
              }
            : editing
        }
        onCancel={() => setFormVisible(false)}
        onSave={handleSave}
        onImportFromDevice={handleImport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  list: { padding: 16, gap: 8 },
  empty: { textAlign: "center", color: "#8E8E93", marginTop: 40 },
  row: { padding: 14, borderRadius: 10, backgroundColor: "#F2F2F7" },
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
