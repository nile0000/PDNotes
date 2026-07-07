import SwiftUI

struct DayMedicationScreen: View {
    @EnvironmentObject var store: AppStore
    let dateKey: String
    @State private var showAddForm = false
    @State private var editingSchedule: MedicationSchedule?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text(dateKey).font(.title2).bold()
                    Spacer()
                    if !showAddForm {
                        Button("+ Add") { showAddForm = true }
                    }
                }

                if showAddForm {
                    AddMedicationForm(
                        defaultStartDate: dateKey,
                        onSave: { schedule in
                            store.addOrUpdateSchedule(schedule)
                            showAddForm = false
                        },
                        onCancel: { showAddForm = false }
                    )
                }

                Text("Medications for this day").font(.headline)

                let schedules = store.schedules(for: dateKey)
                if schedules.isEmpty {
                    Text("No medications scheduled for this day.").foregroundStyle(.secondary)
                } else {
                    ForEach(schedules) { schedule in
                        if editingSchedule?.id == schedule.id {
                            AddMedicationForm(
                                existing: schedule,
                                defaultStartDate: schedule.startDate,
                                onSave: { updated in
                                    store.addOrUpdateSchedule(updated)
                                    editingSchedule = nil
                                },
                                onCancel: { editingSchedule = nil }
                            )
                        } else {
                            MedicationScheduleCard(
                                schedule: schedule,
                                onEdit: { editingSchedule = schedule },
                                onRemove: { store.deleteSchedule(schedule.id) }
                            )
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle(dateKey)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct MedicationScheduleCard: View {
    let schedule: MedicationSchedule
    var onEdit: () -> Void
    var onRemove: () -> Void

    var body: some View {
        Button(action: onEdit) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(schedule.name).fontWeight(.semibold)
                    if !schedule.dose.isEmpty {
                        Text("Dose: \(schedule.dose)").font(.caption).foregroundStyle(.secondary)
                    }
                    if !schedule.timing.isEmpty {
                        Text("When: \(schedule.timing)").font(.caption).foregroundStyle(.secondary)
                    }
                    if !schedule.purpose.isEmpty {
                        Text("Purpose: \(schedule.purpose)").font(.caption).foregroundStyle(.secondary)
                    }
                    Text(schedule.endDate == nil ? "From \(schedule.startDate) onwards" : "\(schedule.startDate) – \(schedule.endDate!)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .padding(.top, 2)
                }
                Spacer()
                Button {
                    onRemove()
                } label: {
                    Image(systemName: "xmark")
                        .foregroundStyle(.red)
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

struct AddMedicationForm: View {
    var existing: MedicationSchedule?
    var defaultStartDate: String
    var onSave: (MedicationSchedule) -> Void
    var onCancel: () -> Void

    private static let timingOptions = ["Day", "Afternoon", "Night"]

    @State private var name: String = ""
    @State private var dose: String = ""
    @State private var timing: String = ""
    @State private var purpose: String = ""
    @State private var startDate: Date = Date()
    @State private var hasEndDate = false
    @State private var endDate: Date = Date()

    init(existing: MedicationSchedule? = nil, defaultStartDate: String, onSave: @escaping (MedicationSchedule) -> Void, onCancel: @escaping () -> Void) {
        self.existing = existing
        self.defaultStartDate = defaultStartDate
        self.onSave = onSave
        self.onCancel = onCancel
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(existing == nil ? "Add Medication" : "Edit Medication").fontWeight(.bold)

            TextField("Name", text: $name).textFieldStyle(.roundedBorder)
            HStack {
                TextField("Dose", text: $dose).textFieldStyle(.roundedBorder)
                Picker("When", selection: $timing) {
                    Text("When").tag("")
                    ForEach(Self.timingOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }
                .pickerStyle(.menu)
            }
            TextField("Purpose", text: $purpose).textFieldStyle(.roundedBorder)

            DatePicker("Start date", selection: $startDate, displayedComponents: .date)
            Toggle("Has end date", isOn: $hasEndDate)
            if hasEndDate {
                DatePicker("End date", selection: $endDate, displayedComponents: .date)
            }

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
                dose = existing.dose
                timing = existing.timing
                purpose = existing.purpose
                startDate = DateKey.toDate(existing.startDate) ?? Date()
                if let end = existing.endDate {
                    hasEndDate = true
                    endDate = DateKey.toDate(end) ?? Date()
                }
            } else {
                startDate = DateKey.toDate(defaultStartDate) ?? Date()
            }
        }
    }

    private func save() {
        let schedule = MedicationSchedule(
            id: existing?.id ?? UUID().uuidString,
            name: name,
            dose: dose,
            timing: timing,
            purpose: purpose,
            startDate: DateKey.from(startDate),
            endDate: hasEndDate ? DateKey.from(endDate) : nil
        )
        onSave(schedule)
    }
}
