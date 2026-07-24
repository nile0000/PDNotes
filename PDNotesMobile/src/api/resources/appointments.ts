import type { Appointment } from "@pd-notes/shared";
import { apiClient } from "../apiClient";

export const appointmentsApi = {
  list: () => apiClient.get<Appointment[]>("/appointments"),
  create: (appointment: Appointment) => apiClient.post<Appointment>("/appointments", appointment),
  update: (id: string, appointment: Omit<Appointment, "id">) =>
    apiClient.put<Appointment>(`/appointments/${id}`, appointment),
  remove: (id: string) => apiClient.delete<void>(`/appointments/${id}`),
};
