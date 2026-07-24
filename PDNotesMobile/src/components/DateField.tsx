import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { fromDateKey, toDateKey } from "../utils/dateKey";

interface Props {
  label: string;
  value: string;
  onChange: (dateKey: string) => void;
}

export function DateField({ label, value, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.button} onPress={() => setShowPicker(true)}>
        <Text style={styles.buttonText}>{value}</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={fromDateKey(value)}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selected) => {
            setShowPicker(Platform.OS === "ios");
            if (event.type === "set" && selected) {
              onChange(toDateKey(selected));
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  label: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  button: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonText: { fontSize: 16 },
});
