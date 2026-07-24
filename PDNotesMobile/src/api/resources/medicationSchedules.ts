import type { MedicationSchedule } from "@pd-notes/shared";
import { apiClient } from "../apiClient";

export const medicationSchedulesApi = {
  list: () => apiClient.get<MedicationSchedule[]>("/medication-schedules"),
  create: (schedule: MedicationSchedule) =>
    apiClient.post<MedicationSchedule>("/medication-schedules", schedule),
  update: (id: string, schedule: Omit<MedicationSchedule, "id">) =>
    apiClient.put<MedicationSchedule>(`/medication-schedules/${id}`, schedule),
  remove: (id: string) => apiClient.delete<void>(`/medication-schedules/${id}`),
};
