import { Router } from "express";
import { dateKeySchema, daySymptomsUpsertSchema } from "@pd-notes/shared";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { listDaySymptoms, upsertDaySymptoms } from "../services/daySymptoms.js";

export const daySymptomsRouter = Router();

daySymptomsRouter.use(requireAuth);

daySymptomsRouter.get("/day-symptoms", async (req, res, next) => {
  try {
    res.json(await listDaySymptoms(req.supabase!));
  } catch (err) {
    next(err);
  }
});

daySymptomsRouter.put(
  "/day-symptoms/:date",
  validateBody(daySymptomsUpsertSchema),
  async (req, res, next) => {
    try {
      const dateResult = dateKeySchema.safeParse(req.params.date);
      if (!dateResult.success) {
        res.status(400).json({ error: "Invalid date param" });
        return;
      }
      const updated = await upsertDaySymptoms(
        req.supabase!,
        req.user!.id,
        dateResult.data,
        req.body
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);
