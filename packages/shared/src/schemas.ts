import { z } from "zod";

/** "yyyy-MM-dd" date key, compared as a plain string throughout the apps. */
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a yyyy-MM-dd date string");

/** 24h "HH:mm", or "" when unset. */
export const timeSchema = z
  .string()
  .regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Expected "HH:mm" (24h) or ""');

export const dayRatingSchema = z.enum(["GOOD", "NORMAL", "BAD"]);

/** 0 = unset, 1 (Great) .. 5 (Terrible). */
export const severitySchema = z.number().int().min(0).max(5);

export const symptomCategories = [
  "tremors",
  "legs",
  "plumbing",
  "neuropathy",
  "sleep",
  "diet",
  "pain",
] as const;

// ---------------------------------------------------------------------------
// Medication schedule
// ---------------------------------------------------------------------------

export const medicationScheduleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  dose: z.string().default(""),
  timing: z.string().default(""),
  purpose: z.string().default(""),
  startDate: dateKeySchema,
  endDate: dateKeySchema.nullable().default(null),
});

export const medicationScheduleCreateSchema = medicationScheduleSchema;
export const medicationScheduleUpdateSchema = medicationScheduleSchema.omit({
  id: true,
});

// ---------------------------------------------------------------------------
// Day status (one per user per date)
// ---------------------------------------------------------------------------

export const dayStatusSchema = z.object({
  date: dateKeySchema,
  rating: dayRatingSchema.default("NORMAL"),
  note: z.string().default(""),
  exercise: z.string().default(""),
  isRead: z.boolean().default(false),
});

export const dayStatusUpsertSchema = dayStatusSchema.omit({ date: true });

// ---------------------------------------------------------------------------
// Day symptoms (one per user per date)
// ---------------------------------------------------------------------------

export const daySymptomsSchema = z.object({
  date: dateKeySchema,
  tremors: z.string().default(""),
  tremorsSeverity: severitySchema.default(0),
  legs: z.string().default(""),
  legsSeverity: severitySchema.default(0),
  plumbing: z.string().default(""),
  plumbingSeverity: severitySchema.default(0),
  neuropathy: z.string().default(""),
  neuropathySeverity: severitySchema.default(0),
  sleep: z.string().default(""),
  sleepSeverity: severitySchema.default(0),
  diet: z.string().default(""),
  dietSeverity: severitySchema.default(0),
  pain: z.string().default(""),
  painSeverity: severitySchema.default(0),
});

export const daySymptomsUpsertSchema = daySymptomsSchema.omit({ date: true });

// ---------------------------------------------------------------------------
// Appointment
// ---------------------------------------------------------------------------

export const appointmentSchema = z.object({
  id: z.string().uuid(),
  date: dateKeySchema,
  title: z.string().min(1),
  time: timeSchema.default(""),
  location: z.string().default(""),
  notes: z.string().default(""),
  contactId: z.string().uuid().nullable().default(null),
});

export const appointmentCreateSchema = appointmentSchema;
export const appointmentUpdateSchema = appointmentSchema.omit({ id: true });

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export const contactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  role: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  address: z.string().default(""),
  notes: z.string().default(""),
});

export const contactCreateSchema = contactSchema;
export const contactUpdateSchema = contactSchema.omit({ id: true });

// ---------------------------------------------------------------------------
// Bulk sync payload
// ---------------------------------------------------------------------------

export const syncResponseSchema = z.object({
  medicationSchedules: z.array(medicationScheduleSchema),
  dayStatuses: z.array(dayStatusSchema),
  daySymptoms: z.array(daySymptomsSchema),
  appointments: z.array(appointmentSchema),
  contacts: z.array(contactSchema),
});
