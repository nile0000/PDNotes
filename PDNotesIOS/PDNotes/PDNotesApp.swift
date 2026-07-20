import SwiftUI

@main
struct PDNotesApp: App {
    @StateObject private var store = AppStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
        }
        .onChange(of: scenePhase) { phase in
            if phase == .background {
                PersistenceQueue.flush()
            }
        }
    }
}

enum TopScreen: String, CaseIterable {
    case tracker = "Tracker"
    case calendar = "Calendar"
    case meds = "Meds"
    case notes = "Notes"
    case symptoms = "Symptoms"
    case trends = "Trends"
    case contacts = "Contacts"

    var systemImage: String {
        switch self {
        case .tracker: return "list.bullet.rectangle"
        case .calendar: return "calendar"
        case .meds: return "pills"
        case .notes: return "note.text"
        case .symptoms: return "waveform.path.ecg"
        case .trends: return "chart.line.uptrend.xyaxis"
        case .contacts: return "person.crop.circle"
        }
    }
}

struct RootView: View {
    @State private var currentScreen: TopScreen = .tracker

    var body: some View {
        TabView(selection: $currentScreen) {
            NavigationStack {
                TrackerScreen()
            }
            .tabItem { Label(TopScreen.tracker.rawValue, systemImage: TopScreen.tracker.systemImage) }
            .tag(TopScreen.tracker)

            CalendarScreen()
                .tabItem { Label(TopScreen.calendar.rawValue, systemImage: TopScreen.calendar.systemImage) }
                .tag(TopScreen.calendar)

            NavigationStack {
                MedicationsScreen()
            }
            .tabItem { Label(TopScreen.meds.rawValue, systemImage: TopScreen.meds.systemImage) }
            .tag(TopScreen.meds)

            NavigationStack {
                NotesSummaryScreen()
            }
            .tabItem { Label(TopScreen.notes.rawValue, systemImage: TopScreen.notes.systemImage) }
            .tag(TopScreen.notes)

            NavigationStack {
                SymptomsScreen()
            }
            .tabItem { Label(TopScreen.symptoms.rawValue, systemImage: TopScreen.symptoms.systemImage) }
            .tag(TopScreen.symptoms)

            NavigationStack {
                SymptomTrendsScreen()
            }
            .tabItem { Label(TopScreen.trends.rawValue, systemImage: TopScreen.trends.systemImage) }
            .tag(TopScreen.trends)

            NavigationStack {
                ContactsScreen()
            }
            .tabItem { Label(TopScreen.contacts.rawValue, systemImage: TopScreen.contacts.systemImage) }
            .tag(TopScreen.contacts)
        }
    }
}
