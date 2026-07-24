import { Router } from "express";
import type { SyncResponse } from "@pd-notes/shared";
import { requireAuth } from "../middleware/auth.js";
import { listAppointments } from "../services/appointments.js";
import { listContacts } from "../services/contacts.js";
import { listDayStatuses } from "../services/dayStatuses.js";
import { listDaySymptoms } from "../services/daySymptoms.js";
import { listMedicationSchedules } from "../services/medicationSchedules.js";

export const syncRouter = Router();

syncRouter.use(requireAuth);

syncRouter.get("/sync", async (req, res, next) => {
  try {
    const supabase = req.supabase!;
    const [medicationSchedules, dayStatuses, daySymptoms, appointments, contacts] =
      await Promise.all([
        listMedicationSchedules(supabase),
        listDayStatuses(supabase),
        listDaySymptoms(supabase),
        listAppointments(supabase),
        listContacts(supabase),
      ]);

    const response: SyncResponse = {
      medicationSchedules,
      dayStatuses,
      daySymptoms,
      appointments,
      contacts,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});
