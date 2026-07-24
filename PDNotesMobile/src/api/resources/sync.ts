import type { SyncResponse } from "@pd-notes/shared";
import { apiClient } from "../apiClient";

export const syncApi = {
  fetch: () => apiClient.get<SyncResponse>("/sync"),
};
