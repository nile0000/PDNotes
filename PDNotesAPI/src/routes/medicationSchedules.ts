import { Router } from "express";
import { medicationScheduleCreateSchema, medicationScheduleUpdateSchema } from "@pd-notes/shared";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  createMedicationSchedule,
  deleteMedicationSchedule,
  listMedicationSchedules,
  updateMedicationSchedule,
} from "../services/medicationSchedules.js";

export const medicationSchedulesRouter = Router();

medicationSchedulesRouter.use(requireAuth);

medicationSchedulesRouter.get("/medication-schedules", async (req, res, next) => {
  try {
    res.json(await listMedicationSchedules(req.supabase!));
  } catch (err) {
    next(err);
  }
});

medicationSchedulesRouter.post(
  "/medication-schedules",
  validateBody(medicationScheduleCreateSchema),
  async (req, res, next) => {
    try {
      const created = await createMedicationSchedule(req.supabase!, req.user!.id, req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
);

medicationSchedulesRouter.put(
  "/medication-schedules/:id",
  validateBody(medicationScheduleUpdateSchema),
  async (req, res, next) => {
    try {
      const updated = await updateMedicationSchedule(req.supabase!, req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: "Medication schedule not found" });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

medicationSchedulesRouter.delete("/medication-schedules/:id", async (req, res, next) => {
  try {
    const deleted = await deleteMedicationSchedule(req.supabase!, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Medication schedule not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
