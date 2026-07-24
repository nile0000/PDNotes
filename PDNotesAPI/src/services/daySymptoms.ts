import type { SupabaseClient } from "@supabase/supabase-js";
import type { DaySymptoms } from "@pd-notes/shared";
import { symptomCategories } from "@pd-notes/shared";

type DaySymptomsRow = {
  date: string;
} & {
  [K in (typeof symptomCategories)[number]]: string;
} & {
  [K in `${(typeof symptomCategories)[number]}_severity`]: number;
};

function toModel(row: DaySymptomsRow): DaySymptoms {
  const model: Record<string, unknown> = { date: row.date };
  for (const category of symptomCategories) {
    model[category] = row[category as keyof DaySymptomsRow];
    model[`${category}Severity`] = row[`${category}_severity` as keyof DaySymptomsRow];
  }
  return model as DaySymptoms;
}

function toRow(userId: string, date: string, symptoms: Omit<DaySymptoms, "date">) {
  const row: Record<string, unknown> = { user_id: userId, date };
  for (const category of symptomCategories) {
    row[category] = symptoms[category as keyof typeof symptoms];
    row[`${category}_severity`] = symptoms[`${category}Severity` as keyof typeof symptoms];
  }
  return row;
}

const COLUMNS = [
  "date",
  ...symptomCategories.flatMap((c) => [c, `${c}_severity`]),
].join(", ");

export async function listDaySymptoms(supabase: SupabaseClient): Promise<DaySymptoms[]> {
  const { data, error } = await supabase.from("day_symptoms").select(COLUMNS).order("date");
  if (error) throw error;
  return (data as unknown as DaySymptomsRow[]).map(toModel);
}

export async function upsertDaySymptoms(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  symptoms: Omit<DaySymptoms, "date">
): Promise<DaySymptoms> {
  const { data, error } = await supabase
    .from("day_symptoms")
    .upsert(toRow(userId, date, symptoms), { onConflict: "user_id,date" })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toModel(data as unknown as DaySymptomsRow);
}
