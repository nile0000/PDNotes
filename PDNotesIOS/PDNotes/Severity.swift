import SwiftUI

// 1 = mildest (green) ... 5 = worst (red)
let severityLabels: [Int: String] = [1: "Great", 2: "Good", 3: "Fine", 4: "Bad", 5: "Terrible"]

func severityColor(_ level: Int) -> Color {
    switch level {
    case 1: return Color(red: 0x4C / 255, green: 0xAF / 255, blue: 0x50 / 255)
    case 2: return Color(red: 0x8B / 255, green: 0xC3 / 255, blue: 0x4A / 255)
    case 3: return Color(red: 0xFF / 255, green: 0xC1 / 255, blue: 0x07 / 255)
    case 4: return Color(red: 0xFF / 255, green: 0x98 / 255, blue: 0x00 / 255)
    case 5: return Color(red: 0xF4 / 255, green: 0x43 / 255, blue: 0x36 / 255)
    default: return Color(.systemGray4)
    }
}

func severityDisplay(_ level: Int) -> String {
    if let label = severityLabels[level] { return "\(level)/5 - \(label)" }
    return "\(level)/5"
}

/// Tap a chip to set that severity; tap the already-selected chip to clear it back to 0 (unrated).
struct SeverityRatingView: View {
    let value: Int
    let onChange: (Int) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Severity:").font(.caption2).foregroundStyle(.secondary)
            HStack(spacing: 6) {
                ForEach(1...5, id: \.self) { level in
                    let selected = value == level
                    Button {
                        onChange(selected ? 0 : level)
                    } label: {
                        VStack(spacing: 1) {
                            Text("\(level)")
                                .font(.caption)
                                .foregroundStyle(selected ? Color.white : Color.secondary)
                                .frame(width: 26, height: 26)
                                .background(selected ? severityColor(level) : Color.clear)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 4)
                                        .stroke(selected ? severityColor(level) : Color(.systemGray3), lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                            Text(severityLabels[level] ?? "")
                                .font(.system(size: 8))
                                .foregroundStyle(.secondary)
                                .frame(width: 34)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}
