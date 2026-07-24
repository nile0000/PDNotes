import { Router } from "express";
import { appointmentCreateSchema, appointmentUpdateSchema } from "@pd-notes/shared";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
} from "../services/appointments.js";

export const appointmentsRouter = Router();

appointmentsRouter.use(requireAuth);

appointmentsRouter.get("/appointments", async (req, res, next) => {
  try {
    res.json(await listAppointments(req.supabase!));
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.post(
  "/appointments",
  validateBody(appointmentCreateSchema),
  async (req, res, next) => {
    try {
      const created = await createAppointment(req.supabase!, req.user!.id, req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
);

appointmentsRouter.put(
  "/appointments/:id",
  validateBody(appointmentUpdateSchema),
  async (req, res, next) => {
    try {
      const updated = await updateAppointment(req.supabase!, req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: "Appointment not found" });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

appointmentsRouter.delete("/appointments/:id", async (req, res, next) => {
  try {
    const deleted = await deleteAppointment(req.supabase!, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
