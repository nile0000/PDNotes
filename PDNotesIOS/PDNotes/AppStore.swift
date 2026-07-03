import Foundation
import Combine

@MainActor
final class AppStore: ObservableObject {
    @Published var medicationSchedules: [MedicationSchedule] {
        didSet { PersistedStore.save(medicationSchedules, key: "medicationSchedules") }
    }
    @Published var dayStatuses: [String: DayStatus] {
        didSet { PersistedStore.save(dayStatuses, key: "dayStatuses") }
    }
    @Published var daySymptoms: [String: DaySymptoms] {
        didSet { PersistedStore.save(daySymptoms, key: "daySymptoms") }
    }
    @Published var appointments: [Appointment] {
        didSet { PersistedStore.save(appointments, key: "appointments") }
    }
    @Published var contacts: [Contact] {
        didSet { PersistedStore.save(contacts, key: "contacts") }
    }

    init() {
        medicationSchedules = PersistedStore.load(key: "medicationSchedules", default: [])
        dayStatuses = PersistedStore.load(key: "dayStatuses", default: [:])
        daySymptoms = PersistedStore.load(key: "daySymptoms", default: [:])
        appointments = PersistedStore.load(key: "appointments", default: [])
        contacts = PersistedStore.load(key: "contacts", default: [])
    }

    func schedules(for dateKey: String) -> [MedicationSchedule] {
        schedulesForDate(medicationSchedules, dateKey)
    }

    func status(for dateKey: String) -> DayStatus {
        dayStatuses[dateKey] ?? DayStatus()
    }

    func updateStatus(for dateKey: String, _ mutate: (inout DayStatus) -> Void) {
        var status = dayStatuses[dateKey] ?? DayStatus()
        mutate(&status)
        dayStatuses[dateKey] = status
    }

    func symptoms(for dateKey: String) -> DaySymptoms {
        daySymptoms[dateKey] ?? DaySymptoms()
    }

    func updateSymptoms(for dateKey: String, _ mutate: (inout DaySymptoms) -> Void) {
        var symptoms = daySymptoms[dateKey] ?? DaySymptoms()
        mutate(&symptoms)
        daySymptoms[dateKey] = symptoms
    }

    func appointments(for dateKey: String) -> [Appointment] {
        appointmentsForDate(appointments, dateKey).sorted { $0.time < $1.time }
    }

    func appointmentCount(for dateKey: String) -> Int {
        appointmentsForDate(appointments, dateKey).count
    }

    func addOrUpdateSchedule(_ schedule: MedicationSchedule) {
        if let idx = medicationSchedules.firstIndex(where: { $0.id == schedule.id }) {
            medicationSchedules[idx] = schedule
        } else {
            medicationSchedules.append(schedule)
        }
    }

    func deleteSchedule(_ id: String) {
        medicationSchedules.removeAll { $0.id == id }
    }

    func addOrUpdateAppointment(_ appointment: Appointment) {
        if let idx = appointments.firstIndex(where: { $0.id == appointment.id }) {
            appointments[idx] = appointment
        } else {
            appointments.append(appointment)
        }
    }

    func deleteAppointment(_ id: String) {
        appointments.removeAll { $0.id == id }
    }

    func addOrUpdateContact(_ contact: Contact) {
        if let idx = contacts.firstIndex(where: { $0.id == contact.id }) {
            contacts[idx] = contact
        } else {
            contacts.append(contact)
        }
    }

    func deleteContact(_ id: String) {
        contacts.removeAll { $0.id == id }
    }

    var activeSchedules: [MedicationSchedule] {
        let today = DateKey.today()
        return medicationSchedules.filter { $0.endDate == nil || $0.endDate! >= today }
    }

    var pastSchedules: [MedicationSchedule] {
        let today = DateKey.today()
        return medicationSchedules.filter { ($0.endDate ?? "") != "" && $0.endDate! < today }
    }

    var notesDays: [(dateKey: String, status: DayStatus)] {
        let noteDates = Set(dayStatuses.filter { !$0.value.note.isEmpty || !$0.value.exercise.isEmpty }.keys)
        let symptomDates = Set(daySymptoms.filter { $0.value.hasContent }.keys)
        return noteDates.union(symptomDates)
            .map { (dateKey: $0, status: dayStatuses[$0] ?? DayStatus()) }
            .sorted { $0.dateKey > $1.dateKey }
    }

    func markAllNotesRead() {
        for entry in notesDays where !entry.status.isRead {
            updateStatus(for: entry.dateKey) { $0.isRead = true }
        }
    }
}
