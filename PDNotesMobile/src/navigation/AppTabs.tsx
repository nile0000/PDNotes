import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ContactsScreen } from "../screens/contacts/ContactsScreen";
import { MedicationsScreen } from "../screens/medications/MedicationsScreen";
import { NotesScreen } from "../screens/notes/NotesScreen";
import { SymptomsScreen } from "../screens/symptoms/SymptomsScreen";
import { TrendsScreen } from "../screens/trends/TrendsScreen";
import { CalendarStack } from "./CalendarStack";
import { TrackerStack } from "./TrackerStack";
import type { AppTabParamList } from "./types";

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Tracker" component={TrackerStack} />
      <Tab.Screen name="Calendar" component={CalendarStack} />
      <Tab.Screen name="Medications" component={MedicationsScreen} options={{ headerShown: true }} />
      <Tab.Screen name="Notes" component={NotesScreen} options={{ headerShown: true }} />
      <Tab.Screen name="Symptoms" component={SymptomsScreen} options={{ headerShown: true }} />
      <Tab.Screen name="Trends" component={TrendsScreen} options={{ headerShown: true }} />
      <Tab.Screen name="Contacts" component={ContactsScreen} options={{ headerShown: true }} />
    </Tab.Navigator>
  );
}
