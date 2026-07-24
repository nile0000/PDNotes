import type { SupabaseClient } from "@supabase/supabase-js";
import type { MedicationSchedule } from "@pd-notes/shared";

interface MedicationScheduleRow {
  id: string;
  name: string;
  dose: string;
  timing: string;
  purpose: string;
  start_date: string;
  end_date: string | null;
}

function toModel(row: MedicationScheduleRow): MedicationSchedule {
  return {
    id: row.id,
    name: row.name,
    dose: row.dose,
    timing: row.timing,
    purpose: row.purpose,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

function toRow(userId: string, s: MedicationSchedule) {
  return {
    id: s.id,
    user_id: userId,
    name: s.name,
    dose: s.dose,
    timing: s.timing,
    purpose: s.purpose,
    start_date: s.startDate,
    end_date: s.endDate,
  };
}

function toUpdateRow(s: Omit<MedicationSchedule, "id">) {
  return {
    name: s.name,
    dose: s.dose,
    timing: s.timing,
    purpose: s.purpose,
    start_date: s.startDate,
    end_date: s.endDate,
  };
}

const COLUMNS = "id, name, dose, timing, purpose, start_date, end_date";

export async function listMedicationSchedules(
  supabase: SupabaseClient
): Promise<MedicationSchedule[]> {
  const { data, error } = await supabase
    .from("medication_schedules")
    .select(COLUMNS)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data as MedicationScheduleRow[]).map(toModel);
}

export async function createMedicationSchedule(
  supabase: SupabaseClient,
  userId: string,
  schedule: MedicationSchedule
): Promise<MedicationSchedule> {
  const { data, error } = await supabase
    .from("medication_schedules")
    .insert(toRow(userId, schedule))
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toModel(data as MedicationScheduleRow);
}

export async function updateMedicationSchedule(
  supabase: SupabaseClient,
  id: string,
  schedule: Omit<MedicationSchedule, "id">
): Promise<MedicationSchedule | null> {
  const { data, error } = await supabase
    .from("medication_schedules")
    .update(toUpdateRow(schedule))
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? toModel(data as MedicationScheduleRow) : null;
}

export async function deleteMedicationSchedule(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("medication_schedules")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
