import SwiftUI

struct SymptomsScreen: View {
    @EnvironmentObject var store: AppStore

    private var entries: [(dateKey: String, symptoms: DaySymptoms)] {
        store.daySymptoms
            .filter { $0.value.hasContent }
            .map { (dateKey: $0.key, symptoms: $0.value) }
            .sorted { $0.dateKey > $1.dateKey }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("Symptoms")
                    .font(.system(size: 32, weight: .bold))

                if entries.isEmpty {
                    Text("No symptoms recorded yet.").foregroundStyle(.secondary)
                } else {
                    ForEach(entries, id: \.dateKey) { entry in
                        SymptomDayCard(dateKey: entry.dateKey, symptoms: entry.symptoms)
                    }
                }
            }
            .padding()
        }
        .navigationBarHidden(true)
    }
}

private struct SymptomDayCard: View {
    let dateKey: String
    let symptoms: DaySymptoms

    private var rows: [(label: String, value: String, severity: Int)] {
        [
            ("Pain", symptoms.pain, symptoms.painSeverity),
            ("Tremors", symptoms.tremors, symptoms.tremorsSeverity),
            ("Legs", symptoms.legs, symptoms.legsSeverity),
            ("Plumbing", symptoms.plumbing, symptoms.plumbingSeverity),
            ("Neuropathy", symptoms.neuropathy, symptoms.neuropathySeverity),
            ("Sleep", symptoms.sleep, symptoms.sleepSeverity),
            ("Diet", symptoms.diet, symptoms.dietSeverity)
        ].filter { !$0.value.isEmpty || $0.severity > 0 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(dateKey)
                .font(.system(size: 15, weight: .bold))
            Divider()
            ForEach(rows, id: \.label) { row in
                HStack(alignment: .top, spacing: 0) {
                    Text(row.severity > 0 ? "\(row.label) (\(severityDisplay(row.severity))): " : "\(row.label): ")
                        .font(.footnote)
                        .fontWeight(.semibold)
                        .foregroundStyle(row.severity > 0 ? severityColor(row.severity) : Color.accentColor)
                    Text(row.value)
                        .font(.footnote)
                        .foregroundStyle(.primary)
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
