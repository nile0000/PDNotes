export type TrackerStackParamList = {
  TrackerHome: undefined;
  DayMedication: { date: string };
  DayAppointment: { date: string };
};

export type CalendarStackParamList = {
  CalendarHome: undefined;
  DayMedication: { date: string };
  DayAppointment: { date: string };
};

export type AppTabParamList = {
  Tracker: undefined;
  Calendar: undefined;
  Medications: undefined;
  Notes: undefined;
  Symptoms: undefined;
  Trends: undefined;
  Contacts: undefined;
};
