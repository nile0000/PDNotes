import SwiftUI
import Charts

enum TrendRange: String, CaseIterable, Identifiable {
    case week = "1W"
    case month = "1M"
    case threeMonths = "3M"
    case sixMonths = "6M"

    var id: String { rawValue }

    var days: Int {
        switch self {
        case .week: return 7
        case .month: return 30
        case .threeMonths: return 90
        case .sixMonths: return 180
        }
    }
}

private struct TrendSymptomField: Identifiable {
    let id: String
    let label: String
    let severity: (DaySymptoms) -> Int
}

private let trendSymptomFields: [TrendSymptomField] = [
    TrendSymptomField(id: "pain", label: "Pain", severity: { $0.painSeverity }),
    TrendSymptomField(id: "tremors", label: "Tremors", severity: { $0.tremorsSeverity }),
    TrendSymptomField(id: "legs", label: "Legs", severity: { $0.legsSeverity }),
    TrendSymptomField(id: "plumbing", label: "Plumbing", severity: { $0.plumbingSeverity }),
    TrendSymptomField(id: "neuropathy", label: "Neuropathy", severity: { $0.neuropathySeverity }),
    TrendSymptomField(id: "sleep", label: "Sleep", severity: { $0.sleepSeverity }),
    TrendSymptomField(id: "diet", label: "Diet", severity: { $0.dietSeverity })
]

private struct SeverityPoint: Identifiable {
    let id = UUID()
    let date: Date
    let severity: Int
}

struct SymptomTrendsScreen: View {
    @EnvironmentObject var store: AppStore
    @State private var selectedRange: TrendRange = .week
    @State private var selectedSymptomId: String = trendSymptomFields.first!.id

    private var selectedField: TrendSymptomField {
        trendSymptomFields.first { $0.id == selectedSymptomId } ?? trendSymptomFields[0]
    }

    private var cutoffDate: Date {
        Calendar.current.date(byAdding: .day, value: -selectedRange.days, to: Date()) ?? Date()
    }

    private var points: [SeverityPoint] {
        let field = selectedField
        let cutoffKey = DateKey.from(cutoffDate)
        let todayKey = DateKey.today()
        return store.daySymptoms.compactMap { (dateKey, symptoms) -> SeverityPoint? in
            guard dateKey >= cutoffKey && dateKey <= todayKey else { return nil }
            let severity = field.severity(symptoms)
            guard severity > 0, let date = DateKey.toDate(dateKey) else { return nil }
            return SeverityPoint(date: date, severity: severity)
        }.sorted { $0.date < $1.date }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Symptom Trends")
                .font(.system(size: 32, weight: .bold))
                .padding(.horizontal)
                .padding(.top)

            Picker("Range", selection: $selectedRange) {
                ForEach(TrendRange.allCases) { range in
                    Text(range.rawValue).tag(range)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(trendSymptomFields) { field in
                        let selected = field.id == selectedSymptomId
                        Button {
                            selectedSymptomId = field.id
                        } label: {
                            Text(field.label)
                                .font(.subheadline)
                                .foregroundStyle(selected ? Color.accentColor : Color.primary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(selected ? Color.accentColor.opacity(0.15) : Color.clear)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(selected ? Color.accentColor : Color(.systemGray3), lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }

            if points.isEmpty {
                Text("No \(selectedField.label) ratings recorded in this range.")
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
                    .padding(.top, 24)
                Spacer()
            } else {
                Chart(points) { point in
                    LineMark(x: .value("Date", point.date), y: .value("Severity", point.severity))
                        .foregroundStyle(Color.accentColor)
                    PointMark(x: .value("Date", point.date), y: .value("Severity", point.severity))
                        .foregroundStyle(severityColor(point.severity))
                        .symbolSize(70)
                }
                .chartYScale(domain: 1...5)
                .chartYAxis {
                    AxisMarks(values: [1, 2, 3, 4, 5]) { value in
                        AxisGridLine()
                        AxisValueLabel {
                            if let level = value.as(Int.self) {
                                Text(level == 1 || level == 3 || level == 5 ? "\(level) - \(severityLabels[level] ?? "")" : "\(level)")
                                    .foregroundStyle(severityColor(level))
                                    .font(.caption2)
                            }
                        }
                    }
                }
                .chartXScale(domain: cutoffDate...Date())
                .chartXAxis {
                    AxisMarks(values: .stride(by: .day, count: max(1, selectedRange.days / 4))) { _ in
                        AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                    }
                }
                .frame(height: 240)
                .padding(.horizontal)

                Spacer()
            }
        }
        .navigationBarHidden(true)
    }
}
