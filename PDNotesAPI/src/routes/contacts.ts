import { Router } from "express";
import { contactCreateSchema, contactUpdateSchema } from "@pd-notes/shared";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createContact, deleteContact, listContacts, updateContact } from "../services/contacts.js";

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get("/contacts", async (req, res, next) => {
  try {
    res.json(await listContacts(req.supabase!));
  } catch (err) {
    next(err);
  }
});

contactsRouter.post("/contacts", validateBody(contactCreateSchema), async (req, res, next) => {
  try {
    const created = await createContact(req.supabase!, req.user!.id, req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

contactsRouter.put(
  "/contacts/:id",
  validateBody(contactUpdateSchema),
  async (req, res, next) => {
    try {
      const updated = await updateContact(req.supabase!, req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: "Contact not found" });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

contactsRouter.delete("/contacts/:id", async (req, res, next) => {
  try {
    const deleted = await deleteContact(req.supabase!, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
