import SwiftUI

private let monthYearFormatter: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "MMMM yyyy"
    return f
}()

private let weekdayFormatter: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "EEE"
    return f
}()

struct CalendarScreen: View {
    @EnvironmentObject var store: AppStore
    @State private var monthAnchor: Date = {
        let comps = Calendar.current.dateComponents([.year, .month], from: Date())
        return Calendar.current.date(from: comps) ?? Date()
    }()
    @State private var tappedDayKey: String?
    @State private var showingDialog = false

    private var calendar: Calendar { Calendar.current }
    private var todayKey: String { DateKey.today() }

    private var weeksInMonth: [[Date]] {
        guard let monthStart = calendar.date(from: calendar.dateComponents([.year, .month], from: monthAnchor)) else { return [] }
        let firstWeekday = calendar.component(.weekday, from: monthStart)
        let leadingOffset = (firstWeekday - calendar.firstWeekday + 7) % 7
        guard let gridStart = calendar.date(byAdding: .day, value: -leadingOffset, to: monthStart) else { return [] }

        var weeks: [[Date]] = []
        for w in 0..<6 {
            var week: [Date] = []
            for d in 0..<7 {
                if let date = calendar.date(byAdding: .day, value: w * 7 + d, to: gridStart) {
                    week.append(date)
                }
            }
            weeks.append(week)
        }
        return weeks
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                HStack {
                    Button {
                        monthAnchor = calendar.date(byAdding: .month, value: -1, to: monthAnchor) ?? monthAnchor
                    } label: {
                        Image(systemName: "chevron.left")
                    }
                    Spacer()
                    Text(monthYearFormatter.string(from: monthAnchor))
                        .font(.headline)
                    Spacer()
                    Button {
                        monthAnchor = calendar.date(byAdding: .month, value: 1, to: monthAnchor) ?? monthAnchor
                    } label: {
                        Image(systemName: "chevron.right")
                    }
                }
                .padding(.horizontal)

                HStack {
                    ForEach(weeksInMonth.first ?? [], id: \.self) { date in
                        Text(weekdayFormatter.string(from: date))
                            .font(.caption2)
                            .fontWeight(.bold)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal)

                ScrollView {
                    VStack(spacing: 4) {
                        ForEach(weeksInMonth, id: \.self) { week in
                            if week.contains(where: { calendar.isDate($0, equalTo: monthAnchor, toGranularity: .month) }) {
                                HStack(spacing: 4) {
                                    ForEach(week, id: \.self) { date in
                                        CalendarDayCell(date: date, monthAnchor: monthAnchor) { dayKey in
                                            tappedDayKey = dayKey
                                            showingDialog = true
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.top)
            .navigationTitle("Calendar")
            .navigationBarTitleDisplayMode(.inline)
            .confirmationDialog(
                tappedDayKey ?? "",
                isPresented: $showingDialog,
                titleVisibility: .visible
            ) {
                if let dayKey = tappedDayKey {
                    NavigationLink("Daily Tracker") {
                        SingleDayScreen(dateKey: dayKey)
                    }
                    NavigationLink("Appointments") {
                        DayAppointmentScreen(dateKey: dayKey)
                    }
                }
            } message: {
                Text("Open this day in:")
            }
        }
    }
}

private struct CalendarDayCell: View {
    @EnvironmentObject var store: AppStore
    let date: Date
    let monthAnchor: Date
    var onTap: (String) -> Void

    private var calendar: Calendar { Calendar.current }
    private var dayKey: String { DateKey.from(date) }
    private var isSameMonth: Bool { calendar.isDate(date, equalTo: monthAnchor, toGranularity: .month) }
    private var isToday: Bool { dayKey == DateKey.today() }

    var body: some View {
        let status = store.status(for: dayKey)
        let apptCount = store.appointmentCount(for: dayKey)

        Group {
            if isSameMonth {
                Button {
                    onTap(dayKey)
                } label: {
                    VStack(spacing: 1) {
                        Text("\(calendar.component(.day, from: date))")
                            .font(.system(size: 11, weight: .bold))
                        Text(status.rating.emoji)
                            .font(.system(size: 13))
                        if apptCount > 0 {
                            Rectangle()
                                .fill(Color.accentColor)
                                .frame(width: 20, height: 3)
                                .clipShape(RoundedRectangle(cornerRadius: 2))
                        }
                    }
                }
                .buttonStyle(.plain)
            } else {
                Color.clear
            }
        }
        .frame(maxWidth: .infinity, minHeight: 56)
        .background(isSameMonth ? Color(.secondarySystemBackground) : Color.clear)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(isToday ? Color.accentColor : Color.clear, lineWidth: 2)
        )
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}

private struct SingleDayScreen: View {
    let dateKey: String

    var body: some View {
        ScrollView {
            DayCard(date: DateKey.toDate(dateKey) ?? Date())
                .padding()
        }
        .navigationTitle(dateKey)
        .navigationBarTitleDisplayMode(.inline)
    }
}
