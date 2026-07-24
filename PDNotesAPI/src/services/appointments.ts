import type { SupabaseClient } from "@supabase/supabase-js";
import type { Appointment } from "@pd-notes/shared";

interface AppointmentRow {
  id: string;
  date: string;
  title: string;
  time: string;
  location: string;
  notes: string;
  contact_id: string | null;
}

function toModel(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    time: row.time,
    location: row.location,
    notes: row.notes,
    contactId: row.contact_id,
  };
}

function toRow(userId: string, a: Appointment) {
  return {
    id: a.id,
    user_id: userId,
    date: a.date,
    title: a.title,
    time: a.time,
    location: a.location,
    notes: a.notes,
    contact_id: a.contactId,
  };
}

function toUpdateRow(a: Omit<Appointment, "id">) {
  return {
    date: a.date,
    title: a.title,
    time: a.time,
    location: a.location,
    notes: a.notes,
    contact_id: a.contactId,
  };
}

const COLUMNS = "id, date, title, time, location, notes, contact_id";

export async function listAppointments(supabase: SupabaseClient): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(COLUMNS)
    .order("date")
    .order("time");
  if (error) throw error;
  return (data as AppointmentRow[]).map(toModel);
}

export async function createAppointment(
  supabase: SupabaseClient,
  userId: string,
  appointment: Appointment
): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .insert(toRow(userId, appointment))
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toModel(data as AppointmentRow);
}

export async function updateAppointment(
  supabase: SupabaseClient,
  id: string,
  appointment: Omit<Appointment, "id">
): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from("appointments")
    .update(toUpdateRow(appointment))
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? toModel(data as AppointmentRow) : null;
}

export async function deleteAppointment(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
