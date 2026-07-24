import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contact } from "@pd-notes/shared";

interface ContactRow {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

function toContact(row: ContactRow): Contact {
  return { ...row };
}

function toRow(userId: string, contact: Contact): ContactRow & { user_id: string } {
  return { ...contact, user_id: userId };
}

const COLUMNS = "id, name, role, phone, email, address, notes";

export async function listContacts(supabase: SupabaseClient): Promise<Contact[]> {
  const { data, error } = await supabase.from("contacts").select(COLUMNS).order("name");
  if (error) throw error;
  return (data as ContactRow[]).map(toContact);
}

export async function createContact(
  supabase: SupabaseClient,
  userId: string,
  contact: Contact
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .insert(toRow(userId, contact))
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toContact(data as ContactRow);
}

export async function updateContact(
  supabase: SupabaseClient,
  id: string,
  contact: Omit<Contact, "id">
): Promise<Contact | null> {
  const { data, error } = await supabase
    .from("contacts")
    .update(contact)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? toContact(data as ContactRow) : null;
}

export async function deleteContact(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
