import { Pressable, StyleSheet, Text, View } from "react-native";
import { severityColor } from "./severity";

interface Props {
  value: number;
  onChange: (value: number) => void;
}

/** Tri-state: tapping the already-selected level clears it back to 0 (unrated). */
export function SeverityRatingView({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((level) => {
        const selected = value === level;
        return (
          <Pressable
            key={level}
            onPress={() => onChange(selected ? 0 : level)}
            style={[
              styles.chip,
              { borderColor: severityColor(level) },
              selected && { backgroundColor: severityColor(level) },
            ]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{level}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontWeight: "600" },
  chipTextSelected: { color: "#fff" },
});
