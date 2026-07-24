import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DayAppointmentScreen } from "../screens/appointments/DayAppointmentScreen";
import { DayMedicationScreen } from "../screens/medications/DayMedicationScreen";
import { CalendarScreen } from "../screens/calendar/CalendarScreen";
import type { CalendarStackParamList } from "./types";

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CalendarHome" options={{ title: "Calendar" }} component={CalendarScreen} />
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
