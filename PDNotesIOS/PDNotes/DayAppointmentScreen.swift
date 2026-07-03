import SwiftUI

struct DayAppointmentScreen: View {
    @EnvironmentObject var store: AppStore
    let dateKey: String
    @State private var showAddForm = false
    @State private var editingAppointment: Appointment?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text(dateKey).font(.title2).bold()
                    Spacer()
                    if !showAddForm && editingAppointment == nil {
                        Button("+ Add") { showAddForm = true }
                    }
                }

                if showAddForm {
                    AppointmentForm(
                        dateKey: dateKey,
                        existing: nil,
                        onSave: { appointment in
                            store.addOrUpdateAppointment(appointment)
                            showAddForm = false
                        },
                        onCancel: { showAddForm = false }
                    )
                }

                Text("Appointments").font(.headline)

                let dayAppts = store.appointments(for: dateKey)
                if dayAppts.isEmpty {
                    Text("No appointments for this day.").foregroundStyle(.secondary)
                } else {
                    ForEach(dayAppts) { appointment in
                        if editingAppointment?.id == appointment.id {
                            AppointmentForm(
                                dateKey: dateKey,
                                existing: appointment,
                                onSave: { updated in
                                    store.addOrUpdateAppointment(updated)
                                    editingAppointment = nil
                                },
                                onCancel: { editingAppointment = nil }
                            )
                        } else {
                            AppointmentRow(
                                appointment: appointment,
                                onEdit: {
                                    editingAppointment = appointment
                                    showAddForm = false
                                },
                                onRemove: { store.deleteAppointment(appointment.id) }
                            )
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Appointments")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct AppointmentRow: View {
    @EnvironmentObject var store: AppStore
    let appointment: Appointment
    var onEdit: () -> Void
    var onRemove: () -> Void

    var body: some View {
        Button(action: onEdit) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        if !appointment.time.isEmpty {
                            Text(appointment.time).font(.caption).fontWeight(.semibold).foregroundStyle(Color.accentColor)
                        }
                        Text(appointment.title).fontWeight(.semibold)
                    }
                    if !appointment.location.isEmpty {
                        Text("📍 \(appointment.location)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let contact = store.contacts.first(where: { $0.id == appointment.contactId }) {
                        Text("👤 \(contact.role.isEmpty ? contact.name : "\(contact.name) (\(contact.role))")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if !appointment.notes.isEmpty {
                        Text(appointment.notes).font(.caption).foregroundStyle(.secondary).padding(.top, 2)
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

struct AppointmentForm: View {
    @EnvironmentObject var store: AppStore

    let dateKey: String
    let existing: Appointment?
    var onSave: (Appointment) -> Void
    var onCancel: () -> Void

    @State private var title: String = ""
    @State private var time: Date?
    @State private var showTimePicker = false
    @State private var location: String = ""
    @State private var notes: String = ""
    @State private var selectedContactId: String?
    @State private var showContactPicker = false
    @State private var showAddContact = false

    private var selectedContact: Contact? {
        store.contacts.first { $0.id == selectedContactId }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(existing == nil ? "New Appointment" : "Edit Appointment").fontWeight(.bold)

            TextField("Title", text: $title).textFieldStyle(.roundedBorder)

            Button {
                showTimePicker.toggle()
            } label: {
                HStack {
                    Text("Time")
                    Spacer()
                    Text(time.map { Self.timeFormatter.string(from: $0) } ?? "Optional")
                        .foregroundStyle(.secondary)
                    if time != nil {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                            .onTapGesture { time = nil }
                    }
                }
                .padding(8)
                .background(Color(.tertiarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 6))
            }
            .buttonStyle(.plain)
            if showTimePicker {
                DatePicker("", selection: Binding(get: { time ?? Date() }, set: { time = $0 }), displayedComponents: .hourAndMinute)
                    .datePickerStyle(.wheel)
                    .labelsHidden()
            }

            TextField("Location (optional)", text: $location).textFieldStyle(.roundedBorder)
            TextField("Notes (optional)", text: $notes, axis: .vertical)
                .lineLimit(2...)
                .textFieldStyle(.roundedBorder)

            Text("Contact").font(.subheadline).fontWeight(.medium)

            Button {
                showContactPicker.toggle()
                showAddContact = false
            } label: {
                HStack {
                    Text(selectedContact.map { $0.role.isEmpty ? $0.name : "\($0.name) (\($0.role))" } ?? "None")
                    Spacer()
                    if selectedContactId != nil {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                            .onTapGesture {
                                selectedContactId = nil
                                showContactPicker = false
                            }
                    }
                }
                .padding(8)
                .background(Color(.tertiarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .foregroundStyle(.primary)
            }
            .buttonStyle(.plain)

            if showContactPicker {
                VStack(spacing: 0) {
                    ForEach(store.contacts) { contact in
                        Button {
                            selectedContactId = contact.id
                            if !contact.address.isEmpty { location = contact.address }
                            showContactPicker = false
                        } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(contact.name).font(.subheadline)
                                    if !contact.role.isEmpty {
                                        Text(contact.role).font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                                if contact.id == selectedContactId {
                                    Image(systemName: "checkmark").foregroundStyle(Color.accentColor)
                                }
                            }
                            .padding(10)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        Divider()
                    }
                    Button {
                        showAddContact.toggle()
                        showContactPicker = false
                    } label: {
                        Text("+ Add new contact")
                            .fontWeight(.medium)
                            .padding(10)
                    }
                    .buttonStyle(.plain)
                }
                .background(Color(.tertiarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 6))
            }

            if showAddContact {
                ContactForm(
                    existing: nil,
                    onSave: { newContact in
                        store.addOrUpdateContact(newContact)
                        selectedContactId = newContact.id
                        if !newContact.address.isEmpty { location = newContact.address }
                        showAddContact = false
                    },
                    onCancel: { showAddContact = false }
                )
            }

            HStack {
                Button("Cancel", role: .cancel, action: onCancel)
                    .buttonStyle(.bordered)
                    .frame(maxWidth: .infinity)
                Button(existing == nil ? "Save" : "Update") { save() }
                    .buttonStyle(.borderedProminent)
                    .frame(maxWidth: .infinity)
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .onAppear {
            if let existing {
                title = existing.title
                time = Self.timeFormatter.date(from: existing.time)
                location = existing.location
                notes = existing.notes
                selectedContactId = existing.contactId
            }
        }
    }

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    private func save() {
        let appointment = Appointment(
            id: existing?.id ?? UUID().uuidString,
            date: dateKey,
            title: title.trimmingCharacters(in: .whitespaces),
            time: time.map { Self.timeFormatter.string(from: $0) } ?? "",
            location: location.trimmingCharacters(in: .whitespaces),
            notes: notes.trimmingCharacters(in: .whitespaces),
            contactId: selectedContactId
        )
        onSave(appointment)
    }
}
