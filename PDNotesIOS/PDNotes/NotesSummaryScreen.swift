import SwiftUI

struct NotesSummaryScreen: View {
    @EnvironmentObject var store: AppStore
    @State private var showRead = false
    @State private var showBadDaysOnly = false

    private var filteredNotes: [(dateKey: String, status: DayStatus)] {
        store.notesDays.filter { entry in
            (showRead || !entry.status.isRead) &&
            (!showBadDaysOnly || entry.status.rating == .bad)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("All Daily Notes")
                .font(.system(size: 32, weight: .bold))
                .padding([.horizontal, .top])
                .padding(.bottom, 8)

            HStack(spacing: 16) {
                if filteredNotes.contains(where: { !$0.status.isRead }) {
                    Button("Mark All Read") { store.markAllNotesRead() }
                        .font(.subheadline)
                }
                Button(showRead ? "Hide Read" : "Show Read") { showRead.toggle() }
                    .font(.subheadline)
                Button(showBadDaysOnly ? "All Days" : "Bad Days Only") { showBadDaysOnly.toggle() }
                    .font(.subheadline)
            }
            .padding(.horizontal)
            .padding(.bottom, 16)

            if filteredNotes.isEmpty {
                Text(emptyMessage)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 32)
                Spacer()
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(filteredNotes, id: \.dateKey) { entry in
                            NoteCard(dateKey: entry.dateKey, status: entry.status)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .navigationBarHidden(true)
    }

    private var emptyMessage: String {
        if showBadDaysOnly { return "No bad days recorded." }
        if showRead { return "No notes recorded yet." }
        return "All notes marked as read."
    }
}

private struct NoteCard: View {
    @EnvironmentObject var store: AppStore
    let dateKey: String
    let status: DayStatus

    var body: some View {
        let symptoms = store.symptoms(for: dateKey)

        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(dateKey)
                    .fontWeight(.bold)
                    .foregroundStyle(status.isRead ? .secondary : .primary)
                Text(status.rating.emoji)
                    .font(.system(size: 18))
                    .opacity(status.isRead ? 0.5 : 1)
                Spacer()
                Button(status.isRead ? "Unarchive" : "Mark Read") {
                    store.updateStatus(for: dateKey) { $0.isRead.toggle() }
                }
                .font(.caption)
            }

            if !status.note.isEmpty {
                Text(status.note)
                    .foregroundStyle(status.isRead ? .secondary : .primary)
                    .padding(.top, 8)
            }

            if !status.exercise.isEmpty {
                Text("• Exercise: \(status.exercise)")
                    .font(.caption)
                    .foregroundStyle(status.isRead ? Color.secondary : Color(.darkGray))
                    .padding(.top, 4)
            }

            if symptoms.hasContent {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Symptoms")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(status.isRead ? .secondary : .primary)
                    symptomLine("Tremors", symptoms.tremors, isRead: status.isRead)
                    symptomLine("Legs", symptoms.legs, isRead: status.isRead)
                    symptomLine("Plumbing", symptoms.plumbing, isRead: status.isRead)
                    symptomLine("Neuropathy", symptoms.neuropathy, isRead: status.isRead)
                    symptomLine("Sleep", symptoms.sleep, isRead: status.isRead)
                    symptomLine("Diet", symptoms.diet, isRead: status.isRead)
                    symptomLine("Pain", symptoms.pain, isRead: status.isRead)
                }
                .padding(.top, 8)
            }
        }
        .padding(12)
        .background(status.isRead ? Color(.systemGray5) : Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    @ViewBuilder
    private func symptomLine(_ label: String, _ value: String, isRead: Bool) -> some View {
        if !value.isEmpty {
            Text("• \(label): \(value)")
                .font(.caption)
                .foregroundStyle(isRead ? Color.secondary : Color(.darkGray))
                .padding(.top, 1)
        }
    }
}
