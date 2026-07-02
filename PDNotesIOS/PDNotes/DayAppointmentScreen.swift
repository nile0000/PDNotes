import SwiftUI

struct DayAppointmentScreen: View {
    @EnvironmentObject var store: AppStore
    let dateKey: String
    @State private var showingForm = false
    @State private var editingAppointment: Appointment?

    var body: some View {
        List {
            ForEach(store.appointments(for: dateKey)) { appointment in
                Button {
                    editingAppointment = appointment
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(appointment.title).font(.body).foregroundStyle(.primary)
                        if !appointment.time.isEmpty {
                            Text(appointment.time).font(.caption).foregroundStyle(.secondary)
                        }
                        if !appointment.location.isEmpty {
                            Text(appointment.location).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .onDelete { indexSet in
                let list = store.appointments(for: dateKey)
                for index in indexSet {
                    store.deleteAppointment(list[index].id)
                }
            }
        }
        .navigationTitle("Appointments")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingForm = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingForm) {
            AppointmentForm(dateKey: dateKey, existing: nil)
        }
        .sheet(item: $editingAppointment) { appointment in
            AppointmentForm(dateKey: dateKey, existing: appointment)
        }
    }
}

struct AppointmentForm: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss

    let dateKey: String
    let existing: Appointment?

    @State private var title: String = ""
    @State private var time: String = ""
    @State private var location: String = ""
    @State private var notes: String = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Title", text: $title)
                TextField("Time", text: $time)
                TextField("Location", text: $location)
                TextField("Notes", text: $notes, axis: .vertical)
            }
            .navigationTitle(existing == nil ? "Add Appointment" : "Edit Appointment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .onAppear {
            if let existing {
                title = existing.title
                time = existing.time
                location = existing.location
                notes = existing.notes
            }
        }
    }

    private func save() {
        let appointment = Appointment(
            id: existing?.id ?? UUID().uuidString,
            date: dateKey,
            title: title,
            time: time,
            location: location,
            notes: notes
        )
        store.addOrUpdateAppointment(appointment)
        dismiss()
    }
}
