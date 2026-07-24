import { useMemo, useState } from "react";
import { LineChart } from "react-native-gifted-charts";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { symptomCategories, type SymptomCategory } from "@pd-notes/shared";
import { severityColor, severityDisplay } from "../../components/severity";
import { useAppStore } from "../../store/useAppStore";
import { addDays, todayKey } from "../../utils/dateKey";

const CATEGORY_LABELS: Record<SymptomCategory, string> = {
  tremors: "Tremors",
  legs: "Legs",
  plumbing: "Plumbing",
  neuropathy: "Neuropathy",
  sleep: "Sleep",
  diet: "Diet",
  pain: "Pain",
};

const RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
];

export function TrendsScreen() {
  const daySymptoms = useAppStore((s) => s.daySymptoms);
  const [range, setRange] = useState(RANGES[1]);
  const [category, setCategory] = useState<SymptomCategory>("tremors");

  const points = useMemo(() => {
    const today = todayKey();
    const cutoff = addDays(today, -range.days);
    return Object.values(daySymptoms)
      .filter((s) => s.date >= cutoff && s.date <= today && s[`${category}Severity`] > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({
        value: s[`${category}Severity`],
        label: s.date.slice(5),
        dataPointColor: severityColor(s[`${category}Severity`]),
      }));
  }, [daySymptoms, range, category]);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rangeRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r.label}
            onPress={() => setRange(r)}
            style={[styles.rangeChip, range.label === r.label && styles.rangeChipSelected]}
          >
            <Text style={[styles.rangeChipText, range.label === r.label && styles.rangeChipTextSelected]}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
        {symptomCategories.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.categoryChip, category === c && styles.categoryChipSelected]}
          >
            <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextSelected]}>
              {CATEGORY_LABELS[c]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.chartContainer}>
        {points.length === 0 ? (
          <Text style={styles.empty}>No {CATEGORY_LABELS[category].toLowerCase()} entries in this range</Text>
        ) : (
          <LineChart
            data={points}
            maxValue={5}
            stepValue={1}
            noOfSections={5}
            spacing={Math.max(32, 300 / points.length)}
            color="#2563EB"
            thickness={2}
            yAxisTextStyle={{ fontSize: 10 }}
            xAxisLabelTextStyle={{ fontSize: 9 }}
            rotateLabel
          />
        )}
      </View>

      <View style={styles.legend}>
        {[1, 2, 3, 4, 5].map((level) => (
          <View key={level} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: severityColor(level) }]} />
            <Text style={styles.legendText}>
              {level} – {severityDisplay(level)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, gap: 12 },
  rangeRow: { flexDirection: "row" },
  rangeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: "#F2F2F7", marginRight: 8 },
  rangeChipSelected: { backgroundColor: "#2563EB" },
  rangeChipText: { fontWeight: "600" },
  rangeChipTextSelected: { color: "#fff" },
  categoryRow: { flexDirection: "row" },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: "#F2F2F7", marginRight: 8 },
  categoryChipSelected: { backgroundColor: "#111827" },
  categoryChipText: { fontWeight: "600", fontSize: 13 },
  categoryChipTextSelected: { color: "#fff" },
  chartContainer: { paddingVertical: 16, minHeight: 220, justifyContent: "center" },
  empty: { textAlign: "center", color: "#8E8E93" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: "#6B7280" },
});
