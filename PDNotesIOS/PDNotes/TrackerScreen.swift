import SwiftUI

private let monthDayFormatter: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "MMM d"
    return f
}()

private let dayLabelFormatter: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "EEE"
    return f
}()

private struct WeekOption: Identifiable {
    let offset: Int
    let label: String
    var id: Int { offset }
}

struct TrackerScreen: View {
    @EnvironmentObject var store: AppStore
    @State private var selectedWeekOffset = 0

    private var calendar: Calendar {
        var cal = Calendar.current
        cal.firstWeekday = Calendar.current.firstWeekday
        return cal
    }

    private var weekOptions: [WeekOption] {
        (-35...0).map { offset in
            var cal = calendar
            var comps = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: Date())
            comps.weekOfYear = (comps.weekOfYear ?? 0) + offset
            let weekStart = cal.date(from: comps) ?? Date()
            let label = offset == 0
                ? "Current Week (\(monthDayFormatter.string(from: weekStart)))"
                : "Week of \(monthDayFormatter.string(from: weekStart))"
            return WeekOption(offset: offset, label: label)
        }
    }

    private var weekStartDate: Date {
        var cal = calendar
        var comps = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: Date())
        comps.weekOfYear = (comps.weekOfYear ?? 0) + selectedWeekOffset
        return cal.date(from: comps) ?? Date()
    }

    private var weekDates: [Date] {
        (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: weekStartDate) }
    }

    private var todayKey: String { DateKey.today() }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("PD Notes")
                        .font(.system(size: 32, weight: .bold))

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Daily Tracker")
                            .font(.title2).bold()

                        Menu {
                            ForEach(weekOptions) { option in
                                Button(option.label) { selectedWeekOffset = option.offset }
                            }
                        } label: {
                            HStack {
                                Text(weekOptions.first { $0.offset == selectedWeekOffset }?.label ?? "")
                                    .foregroundStyle(.primary)
                                Spacer()
                                Image(systemName: "chevron.down")
                                    .foregroundStyle(.secondary)
                            }
                            .padding()
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }

                        VStack(spacing: 12) {
                            ForEach(weekDates, id: \.self) { date in
                                DayCard(date: date)
                                    .id(DateKey.from(date))
                            }
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(radius: 4)
                }
                .padding()
            }
            .onAppear {
                if weekDates.contains(where: { DateKey.from($0) == todayKey }) {
                    proxy.scrollTo(todayKey, anchor: .top)
                }
            }
            .onChange(of: selectedWeekOffset) { _ in
                if weekDates.contains(where: { DateKey.from($0) == todayKey }) {
                    DispatchQueue.main.async {
                        proxy.scrollTo(todayKey, anchor: .top)
                    }
                }
            }
        }
        .navigationBarHidden(true)
    }
}

struct DayCard: View {
    @EnvironmentObject var store: AppStore
    let date: Date

    private var dayKey: String { DateKey.from(date) }
    private var isToday: Bool { dayKey == DateKey.today() }

    var body: some View {
        let status = store.status(for: dayKey)
        let symptoms = store.symptoms(for: dayKey)
        let medsCount = store.schedules(for: dayKey).count
        let dayAppts = store.appointments(for: dayKey)

        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(dayLabelFormatter.string(from: date))
                    .fontWeight(.semibold)
                Spacer()
                NavigationLink {
                    DayAppointmentScreen(dateKey: dayKey)
                } label: {
                    Text(dayAppts.isEmpty ? "Appts" : "Appts (\(dayAppts.count))")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
                Spacer().frame(width: 16)
                NavigationLink {
                    DayMedicationScreen(dateKey: dayKey)
                } label: {
                    Text(medsCount == 0 ? "Meds" : "Meds (\(medsCount))")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
            }

            if !dayAppts.isEmpty {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(dayAppts) { appt in
                        NavigationLink {
                            DayAppointmentScreen(dateKey: dayKey)
                        } label: {
                            Text("• \(appt.time.isEmpty ? "" : "\(appt.time) ")\(appt.title)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            HStack(spacing: 8) {
                Text("Day Rating:").font(.caption)
                ForEach(DayRating.allCases, id: \.self) { rating in
                    Button {
                        store.updateStatus(for: dayKey) { $0.rating = rating }
                    } label: {
                        Text(rating.emoji)
                            .font(.system(size: 18))
                            .frame(width: 32, height: 32)
                            .background(status.rating == rating ? Color.accentColor.opacity(0.25) : Color.clear)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    .buttonStyle(.plain)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Daily Note").font(.caption2).foregroundStyle(.secondary)
                TextField("", text: Binding(
                    get: { status.note },
                    set: { newValue in store.updateStatus(for: dayKey) { $0.note = newValue } }
                ))
                .font(.caption)
            }

            symptomField("Exercise", value: Binding(
                get: { status.exercise },
                set: { newValue in store.updateStatus(for: dayKey) { $0.exercise = newValue } }
            ))

            Divider()

            Text("Symptoms")
                .font(.caption)
                .fontWeight(.semibold)

            symptomSection("Pain",
                note: Binding(get: { symptoms.pain }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.pain = newValue } }),
                severity: Binding(get: { symptoms.painSeverity }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.painSeverity = newValue } }))
            symptomSection("Tremors",
                note: Binding(get: { symptoms.tremors }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.tremors = newValue } }),
                severity: Binding(get: { symptoms.tremorsSeverity }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.tremorsSeverity = newValue } }))
            symptomSection("Legs",
                note: Binding(get: { symptoms.legs }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.legs = newValue } }),
                severity: Binding(get: { symptoms.legsSeverity }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.legsSeverity = newValue } }))
            symptomSection("Plumbing",
                note: Binding(get: { symptoms.plumbing }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.plumbing = newValue } }),
                severity: Binding(get: { symptoms.plumbingSeverity }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.plumbingSeverity = newValue } }))
            symptomSection("Neuropathy",
                note: Binding(get: { symptoms.neuropathy }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.neuropathy = newValue } }),
                severity: Binding(get: { symptoms.neuropathySeverity }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.neuropathySeverity = newValue } }))
            symptomSection("Sleep",
                note: Binding(get: { symptoms.sleep }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.sleep = newValue } }),
                severity: Binding(get: { symptoms.sleepSeverity }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.sleepSeverity = newValue } }))
            symptomSection("Diet",
                note: Binding(get: { symptoms.diet }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.diet = newValue } }),
                severity: Binding(get: { symptoms.dietSeverity }, set: { newValue in store.updateSymptoms(for: dayKey) { $0.dietSeverity = newValue } }))
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func symptomField(_ label: String, value: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.caption2).foregroundStyle(.secondary)
            TextField("", text: value, axis: .vertical)
                .lineLimit(2...)
                .font(.caption)
        }
    }

    private func symptomSection(_ label: String, note: Binding<String>, severity: Binding<Int>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).padding(.top, 6)
            SeverityRatingView(value: severity.wrappedValue, onChange: { severity.wrappedValue = $0 })
            TextField("Notes", text: note, axis: .vertical)
                .lineLimit(1...3)
                .font(.caption)
        }
    }
}
