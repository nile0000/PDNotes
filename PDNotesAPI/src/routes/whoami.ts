import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

export const whoamiRouter = Router();

whoamiRouter.get("/whoami", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
