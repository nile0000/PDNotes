import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayStatus } from "@pd-notes/shared";

interface DayStatusRow {
  date: string;
  rating: string;
  note: string;
  exercise: string;
  is_read: boolean;
}

function toModel(row: DayStatusRow): DayStatus {
  return {
    date: row.date,
    rating: row.rating as DayStatus["rating"],
    note: row.note,
    exercise: row.exercise,
    isRead: row.is_read,
  };
}

const COLUMNS = "date, rating, note, exercise, is_read";

export async function listDayStatuses(supabase: SupabaseClient): Promise<DayStatus[]> {
  const { data, error } = await supabase.from("day_statuses").select(COLUMNS).order("date");
  if (error) throw error;
  return (data as DayStatusRow[]).map(toModel);
}

export async function upsertDayStatus(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  status: Omit<DayStatus, "date">
): Promise<DayStatus> {
  const { data, error } = await supabase
    .from("day_statuses")
    .upsert(
      {
        user_id: userId,
        date,
        rating: status.rating,
        note: status.note,
        exercise: status.exercise,
        is_read: status.isRead,
      },
      { onConflict: "user_id,date" }
    )
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toModel(data as DayStatusRow);
}
