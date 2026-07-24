import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DayAppointmentScreen } from "../screens/appointments/DayAppointmentScreen";
import { DayMedicationScreen } from "../screens/medications/DayMedicationScreen";
import { TrackerScreen } from "../screens/tracker/TrackerScreen";
import type { TrackerStackParamList } from "./types";

const Stack = createNativeStackNavigator<TrackerStackParamList>();

export function TrackerStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TrackerHome" options={{ title: "Tracker" }} component={TrackerScreen} />
      <Stack.Screen
        name="DayMedication"
        options={{ title: "Medications" }}
        component={DayMedicationScreen}
      />
      <Stack.Screen
        name="DayAppointment"
        options={{ title: "Appointments" }}
        component={DayAppointmentScreen}
      />
    </Stack.Navigator>
  );
}
