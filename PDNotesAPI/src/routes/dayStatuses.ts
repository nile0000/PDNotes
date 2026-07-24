import { Router } from "express";
import { dateKeySchema, dayStatusUpsertSchema } from "@pd-notes/shared";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { listDayStatuses, upsertDayStatus } from "../services/dayStatuses.js";

export const dayStatusesRouter = Router();

dayStatusesRouter.use(requireAuth);

dayStatusesRouter.get("/day-statuses", async (req, res, next) => {
  try {
    res.json(await listDayStatuses(req.supabase!));
  } catch (err) {
    next(err);
  }
});

dayStatusesRouter.put(
  "/day-statuses/:date",
  validateBody(dayStatusUpsertSchema),
  async (req, res, next) => {
    try {
      const dateResult = dateKeySchema.safeParse(req.params.date);
      if (!dateResult.success) {
        res.status(400).json({ error: "Invalid date param" });
        return;
      }
      const updated = await upsertDayStatus(
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
