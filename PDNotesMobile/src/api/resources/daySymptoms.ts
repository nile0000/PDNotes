import type { DaySymptoms } from "@pd-notes/shared";
import { apiClient } from "../apiClient";

export const daySymptomsApi = {
  list: () => apiClient.get<DaySymptoms[]>("/day-symptoms"),
  upsert: (date: string, symptoms: Omit<DaySymptoms, "date">) =>
    apiClient.put<DaySymptoms>(`/day-symptoms/${date}`, symptoms),
};
