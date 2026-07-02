import SwiftUI

@main
struct PDNotesApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
        }
    }
}

enum TopScreen: String, CaseIterable {
    case tracker = "Tracker"
    case calendar = "Calendar"
    case meds = "Meds"
    case notes = "Notes"
    case contacts = "Contacts"

    var systemImage: String {
        switch self {
        case .tracker: return "list.bullet.rectangle"
        case .calendar: return "calendar"
        case .meds: return "pills"
        case .notes: return "note.text"
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
                ContactsScreen()
            }
            .tabItem { Label(TopScreen.contacts.rawValue, systemImage: TopScreen.contacts.systemImage) }
            .tag(TopScreen.contacts)
        }
    }
}
