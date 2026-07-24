import type { Contact } from "@pd-notes/shared";
import { apiClient } from "../apiClient";

export const contactsApi = {
  list: () => apiClient.get<Contact[]>("/contacts"),
  create: (contact: Contact) => apiClient.post<Contact>("/contacts", contact),
  update: (id: string, contact: Omit<Contact, "id">) =>
    apiClient.put<Contact>(`/contacts/${id}`, contact),
  remove: (id: string) => apiClient.delete<void>(`/contacts/${id}`),
};
