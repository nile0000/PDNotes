import type { Appointment, DaySymptoms, MedicationSchedule } from "@pd-notes/shared";
import { todayKey } from "../utils/dateKey";

export function schedulesForDate(
  schedules: MedicationSchedule[],
  date: string
): MedicationSchedule[] {
  return schedules.filter((s) => s.startDate <= date && (s.endDate === null || s.endDate >= date));
}

export function appointmentsForDate(appointments: Appointment[], date: string): Appointment[] {
  return appointments
    .filter((a) => a.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function activeSchedules(schedules: MedicationSchedule[]): MedicationSchedule[] {
  const today = todayKey();
  return schedules.filter((s) => s.endDate === null || s.endDate >= today);
}

export function pastSchedules(schedules: MedicationSchedule[]): MedicationSchedule[] {
  const today = todayKey();
  return schedules.filter((s) => s.endDate !== null && s.endDate < today);
}

export function daySymptomsHasContent(symptoms: DaySymptoms | undefined): boolean {
  if (!symptoms) return false;
  return (
    symptoms.tremors !== "" ||
    symptoms.tremorsSeverity > 0 ||
    symptoms.legs !== "" ||
    symptoms.legsSeverity > 0 ||
    symptoms.plumbing !== "" ||
    symptoms.plumbingSeverity > 0 ||
    symptoms.neuropathy !== "" ||
    symptoms.neuropathySeverity > 0 ||
    symptoms.sleep !== "" ||
    symptoms.sleepSeverity > 0 ||
    symptoms.diet !== "" ||
    symptoms.dietSeverity > 0 ||
    symptoms.pain !== "" ||
    symptoms.painSeverity > 0
  );
}

/** Union of dates with a non-blank note/exercise or any symptom content, newest first. */
export function notesDays(
  dayStatuses: Record<string, { note: string; exercise: string }>,
  daySymptoms: Record<string, DaySymptoms>
): string[] {
  const dates = new Set<string>();
  for (const [date, status] of Object.entries(dayStatuses)) {
    if (status.note !== "" || status.exercise !== "") dates.add(date);
  }
  for (const [date, symptoms] of Object.entries(daySymptoms)) {
    if (daySymptomsHasContent(symptoms)) dates.add(date);
  }
  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}
