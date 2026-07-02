import Foundation

enum DayRating: String, Codable, CaseIterable {
    case good = "GOOD"
    case normal = "NORMAL"
    case bad = "BAD"

    var emoji: String {
        switch self {
        case .good: return "🙂"
        case .normal: return "😐"
        case .bad: return "🙁"
        }
    }
}

struct MedicationSchedule: Codable, Identifiable, Equatable {
    var id: String
    var name: String
    var dose: String = ""
    var timing: String = ""
    var purpose: String = ""
    var startDate: String
    var endDate: String?

    func appliesOn(_ dateKey: String) -> Bool {
        guard dateKey >= startDate else { return false }
        if let end = endDate {
            return dateKey <= end
        }
        return true
    }
}

struct DayStatus: Codable, Equatable {
    var takenDay: Bool = false
    var takenAfternoon: Bool = false
    var takenNight: Bool = false
    var rating: DayRating = .normal
    var note: String = ""
    var exercise: String = ""
    var isRead: Bool = false
}

struct DaySymptoms: Codable, Equatable {
    var tremors: String = ""
    var legs: String = ""
    var plumbing: String = ""
    var neuropathy: String = ""
    var sleep: String = ""
    var diet: String = ""
}

struct Appointment: Codable, Identifiable, Equatable {
    var id: String
    var date: String
    var title: String
    var time: String = ""
    var location: String = ""
    var notes: String = ""
    var contactId: String?
}

struct Contact: Codable, Identifiable, Equatable {
    var id: String
    var name: String
    var role: String = ""
    var phone: String = ""
    var email: String = ""
    var address: String = ""
    var notes: String = ""
}

func schedulesForDate(_ schedules: [MedicationSchedule], _ dateKey: String) -> [MedicationSchedule] {
    schedules.filter { $0.appliesOn(dateKey) }
}

func appointmentsForDate(_ appointments: [Appointment], _ dateKey: String) -> [Appointment] {
    appointments.filter { $0.date == dateKey }
}

enum DateKey {
    static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = TimeZone.current
        return f
    }()

    static func from(_ date: Date) -> String {
        formatter.string(from: date)
    }

    static func toDate(_ key: String) -> Date? {
        formatter.date(from: key)
    }

    static func today() -> String {
        from(Date())
    }
}
