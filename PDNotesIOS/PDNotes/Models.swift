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
    var tremorsSeverity: Int = 0
    var legs: String = ""
    var legsSeverity: Int = 0
    var plumbing: String = ""
    var plumbingSeverity: Int = 0
    var neuropathy: String = ""
    var neuropathySeverity: Int = 0
    var sleep: String = ""
    var sleepSeverity: Int = 0
    var diet: String = ""
    var dietSeverity: Int = 0
    var pain: String = ""
    var painSeverity: Int = 0

    var hasContent: Bool {
        !tremors.isEmpty || !legs.isEmpty || !plumbing.isEmpty ||
        !neuropathy.isEmpty || !sleep.isEmpty || !diet.isEmpty || !pain.isEmpty ||
        tremorsSeverity > 0 || legsSeverity > 0 || plumbingSeverity > 0 ||
        neuropathySeverity > 0 || sleepSeverity > 0 || dietSeverity > 0 || painSeverity > 0
    }

    init(tremors: String = "", tremorsSeverity: Int = 0,
         legs: String = "", legsSeverity: Int = 0,
         plumbing: String = "", plumbingSeverity: Int = 0,
         neuropathy: String = "", neuropathySeverity: Int = 0,
         sleep: String = "", sleepSeverity: Int = 0,
         diet: String = "", dietSeverity: Int = 0,
         pain: String = "", painSeverity: Int = 0) {
        self.tremors = tremors
        self.tremorsSeverity = tremorsSeverity
        self.legs = legs
        self.legsSeverity = legsSeverity
        self.plumbing = plumbing
        self.plumbingSeverity = plumbingSeverity
        self.neuropathy = neuropathy
        self.neuropathySeverity = neuropathySeverity
        self.sleep = sleep
        self.sleepSeverity = sleepSeverity
        self.diet = diet
        self.dietSeverity = dietSeverity
        self.pain = pain
        self.painSeverity = painSeverity
    }

    // Custom decoding so existing persisted entries (saved before "pain" and
    // the severity fields existed) still decode instead of falling back to
    // an empty dictionary.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        tremors = try container.decodeIfPresent(String.self, forKey: .tremors) ?? ""
        tremorsSeverity = try container.decodeIfPresent(Int.self, forKey: .tremorsSeverity) ?? 0
        legs = try container.decodeIfPresent(String.self, forKey: .legs) ?? ""
        legsSeverity = try container.decodeIfPresent(Int.self, forKey: .legsSeverity) ?? 0
        plumbing = try container.decodeIfPresent(String.self, forKey: .plumbing) ?? ""
        plumbingSeverity = try container.decodeIfPresent(Int.self, forKey: .plumbingSeverity) ?? 0
        neuropathy = try container.decodeIfPresent(String.self, forKey: .neuropathy) ?? ""
        neuropathySeverity = try container.decodeIfPresent(Int.self, forKey: .neuropathySeverity) ?? 0
        sleep = try container.decodeIfPresent(String.self, forKey: .sleep) ?? ""
        sleepSeverity = try container.decodeIfPresent(Int.self, forKey: .sleepSeverity) ?? 0
        diet = try container.decodeIfPresent(String.self, forKey: .diet) ?? ""
        dietSeverity = try container.decodeIfPresent(Int.self, forKey: .dietSeverity) ?? 0
        pain = try container.decodeIfPresent(String.self, forKey: .pain) ?? ""
        painSeverity = try container.decodeIfPresent(Int.self, forKey: .painSeverity) ?? 0
    }
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
