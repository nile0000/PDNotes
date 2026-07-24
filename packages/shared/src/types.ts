import { z } from "zod";
import {
  appointmentSchema,
  contactSchema,
  dayRatingSchema,
  dayStatusSchema,
  daySymptomsSchema,
  medicationScheduleSchema,
  symptomCategories,
  syncResponseSchema,
} from "./schemas";

export type DayRating = z.infer<typeof dayRatingSchema>;
export type SymptomCategory = (typeof symptomCategories)[number];

export type MedicationSchedule = z.infer<typeof medicationScheduleSchema>;
export type DayStatus = z.infer<typeof dayStatusSchema>;
export type DaySymptoms = z.infer<typeof daySymptomsSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;
