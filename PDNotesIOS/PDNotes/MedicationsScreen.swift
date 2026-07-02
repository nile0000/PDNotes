import SwiftUI

struct MedicationsScreen: View {
    @EnvironmentObject var store: AppStore
    @State private var showAddForm = false
    @State private var editingSchedule: MedicationSchedule?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Medications").font(.system(size: 32, weight: .bold))
                    Spacer()
                    if !showAddForm {
                        Button("+ Add") { showAddForm = true }
                    }
                }

                if showAddForm {
                    AddMedicationForm(
                        defaultStartDate: DateKey.today(),
                        onSave: { schedule in
                            store.addOrUpdateSchedule(schedule)
                            showAddForm = false
                        },
                        onCancel: { showAddForm = false }
                    )
                }

                if store.medicationSchedules.isEmpty && !showAddForm {
                    Text("No medications scheduled yet.").foregroundStyle(.secondary)
                } else {
                    if !store.activeSchedules.isEmpty {
                        Text("Active").font(.caption).fontWeight(.semibold).foregroundStyle(.secondary)
                        ForEach(store.activeSchedules) { schedule in
                            scheduleOrForm(schedule)
                        }
                    }
                    if !store.pastSchedules.isEmpty {
                        Text("Past").font(.caption).fontWeight(.semibold).foregroundStyle(.secondary)
                            .padding(.top, 4)
                        ForEach(store.pastSchedules) { schedule in
                            scheduleOrForm(schedule)
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle("")
        .navigationBarHidden(true)
    }

    @ViewBuilder
    private func scheduleOrForm(_ schedule: MedicationSchedule) -> some View {
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
