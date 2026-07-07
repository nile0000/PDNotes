import SwiftUI
import ContactsUI

struct ContactsScreen: View {
    @EnvironmentObject var store: AppStore
    @State private var showAddForm = false
    @State private var editingContact: Contact?

    private var sorted: [Contact] {
        store.contacts.sorted { $0.name < $1.name }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Contacts").font(.system(size: 28, weight: .bold))
                Spacer()
                if !showAddForm && editingContact == nil {
                    Button("+ Add") { showAddForm = true }
                }
            }
            .padding()

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if showAddForm {
                        ContactForm(
                            existing: nil,
                            onSave: { contact in
                                store.addOrUpdateContact(contact)
                                showAddForm = false
                            },
                            onCancel: { showAddForm = false }
                        )
                    }

                    if sorted.isEmpty && !showAddForm {
                        Text("No contacts yet. Tap + Add to create one.").foregroundStyle(.secondary)
                    }

                    ForEach(sorted) { contact in
                        if editingContact?.id == contact.id {
                            ContactForm(
                                existing: contact,
                                onSave: { updated in
                                    store.addOrUpdateContact(updated)
                                    editingContact = nil
                                },
                                onCancel: { editingContact = nil }
                            )
                        } else {
                            ContactRow(
                                contact: contact,
                                onEdit: {
                                    editingContact = contact
                                    showAddForm = false
                                },
                                onRemove: { store.deleteContact(contact.id) }
                            )
                        }
                    }
                }
                .padding()
            }
        }
    }
}

private struct ContactRow: View {
    let contact: Contact
    var onEdit: () -> Void
    var onRemove: () -> Void

    var body: some View {
        Button(action: onEdit) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(contact.name).fontWeight(.semibold)
                    if !contact.role.isEmpty {
                        Text(contact.role).font(.caption).foregroundStyle(Color.accentColor)
                    }
                    if !contact.phone.isEmpty {
                        Text("📞 \(contact.phone)").font(.caption).foregroundStyle(.secondary)
                    }
                    if !contact.email.isEmpty {
                        Text("✉ \(contact.email)").font(.caption).foregroundStyle(.secondary)
                    }
                    if !contact.address.isEmpty {
                        Text("📍 \(contact.address)").font(.caption).foregroundStyle(.secondary)
                    }
                    if !contact.notes.isEmpty {
                        Text(contact.notes).font(.caption).foregroundStyle(.secondary).padding(.top, 2)
                    }
                }
                Spacer()
                Button {
                    onRemove()
                } label: {
                    Image(systemName: "xmark").foregroundStyle(.red)
                }
                .buttonStyle(.plain)
            }
            .padding(12)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
}

struct ContactForm: View {
    var existing: Contact?
    var onSave: (Contact) -> Void
    var onCancel: () -> Void

    @State private var name: String = ""
    @State private var role: String = ""
    @State private var phone: String = ""
    @State private var email: String = ""
    @State private var address: String = ""
    @State private var notes: String = ""
    @State private var showingPicker = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(existing == nil ? "New Contact" : "Edit Contact").fontWeight(.bold)
                Spacer()
                Button("Import from Contacts") { showingPicker = true }
                    .font(.caption)
            }

            TextField("Name", text: $name).textFieldStyle(.roundedBorder)
            TextField("Role (e.g. Neurologist)", text: $role).textFieldStyle(.roundedBorder)
            TextField("Phone", text: $phone)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.phonePad)
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
            TextField("Address (optional)", text: $address, axis: .vertical)
                .lineLimit(2...)
                .textFieldStyle(.roundedBorder)
            TextField("Notes (optional)", text: $notes, axis: .vertical)
                .lineLimit(2...)
                .textFieldStyle(.roundedBorder)

            HStack {
                Button("Cancel", role: .cancel, action: onCancel)
                    .buttonStyle(.bordered)
                    .frame(maxWidth: .infinity)
                Button(existing == nil ? "Save" : "Update") { save() }
                    .buttonStyle(.borderedProminent)
                    .frame(maxWidth: .infinity)
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .onAppear {
            if let existing {
                name = existing.name
                role = existing.role
                phone = existing.phone
                email = existing.email
                address = existing.address
                notes = existing.notes
            }
        }
        .sheet(isPresented: $showingPicker) {
            ContactPicker { picked in
                name = picked.name.isEmpty ? name : picked.name
                phone = picked.phone.isEmpty ? phone : picked.phone
                email = picked.email.isEmpty ? email : picked.email
                address = picked.address.isEmpty ? address : picked.address
            }
        }
    }

    private func save() {
        let contact = Contact(
            id: existing?.id ?? UUID().uuidString,
            name: name.trimmingCharacters(in: .whitespaces),
            role: role.trimmingCharacters(in: .whitespaces),
            phone: phone.trimmingCharacters(in: .whitespaces),
            email: email.trimmingCharacters(in: .whitespaces),
            address: address.trimmingCharacters(in: .whitespaces),
            notes: notes.trimmingCharacters(in: .whitespaces)
        )
        onSave(contact)
    }
}

private struct PickedContact {
    var name = ""
    var phone = ""
    var email = ""
    var address = ""
}

private struct ContactPicker: UIViewControllerRepresentable {
    var onPick: (PickedContact) -> Void

    func makeUIViewController(context: Context) -> CNContactPickerViewController {
        let picker = CNContactPickerViewController()
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: CNContactPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onPick: onPick)
    }

    final class Coordinator: NSObject, CNContactPickerDelegate {
        let onPick: (PickedContact) -> Void

        init(onPick: @escaping (PickedContact) -> Void) {
            self.onPick = onPick
        }

        func contactPicker(_ picker: CNContactPickerViewController, didSelect contact: CNContact) {
            var picked = PickedContact()
            picked.name = CNContactFormatter.string(from: contact, style: .fullName) ?? ""
            picked.phone = contact.phoneNumbers.first?.value.stringValue ?? ""
            picked.email = (contact.emailAddresses.first?.value as String?) ?? ""
            if let postal = contact.postalAddresses.first?.value {
                picked.address = CNPostalAddressFormatter.string(from: postal, style: .mailingAddress)
                    .replacingOccurrences(of: "\n", with: ", ")
            }
            onPick(picked)
        }
    }
}
