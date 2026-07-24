import type { DayStatus } from "@pd-notes/shared";
import { apiClient } from "../apiClient";

export const dayStatusesApi = {
  list: () => apiClient.get<DayStatus[]>("/day-statuses"),
  upsert: (date: string, status: Omit<DayStatus, "date">) =>
    apiClient.put<DayStatus>(`/day-statuses/${date}`, status),
};
