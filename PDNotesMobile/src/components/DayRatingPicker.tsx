import type { DayRating } from "@pd-notes/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";

const OPTIONS: { rating: DayRating; emoji: string }[] = [
  { rating: "GOOD", emoji: "😊" },
  { rating: "NORMAL", emoji: "😐" },
  { rating: "BAD", emoji: "🙁" },
];

interface Props {
  value: DayRating;
  onChange: (value: DayRating) => void;
}

export function DayRatingPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => (
        <Pressable
          key={option.rating}
          onPress={() => onChange(option.rating)}
          style={[styles.chip, value === option.rating && styles.chipSelected]}
        >
          <Text style={styles.emoji}>{option.emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function dayRatingEmoji(rating: DayRating): string {
  return OPTIONS.find((o) => o.rating === rating)?.emoji ?? "😐";
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
  },
  chipSelected: { backgroundColor: "#D6E9FF" },
  emoji: { fontSize: 22 },
});
