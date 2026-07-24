import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler.js";
import { appointmentsRouter } from "./routes/appointments.js";
import { contactsRouter } from "./routes/contacts.js";
import { dayStatusesRouter } from "./routes/dayStatuses.js";
import { daySymptomsRouter } from "./routes/daySymptoms.js";
import { healthRouter } from "./routes/health.js";
import { medicationSchedulesRouter } from "./routes/medicationSchedules.js";
import { syncRouter } from "./routes/sync.js";
import { whoamiRouter } from "./routes/whoami.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use(healthRouter);
  app.use(whoamiRouter);
  app.use(syncRouter);
  app.use(contactsRouter);
  app.use(medicationSchedulesRouter);
  app.use(appointmentsRouter);
  app.use(dayStatusesRouter);
  app.use(daySymptomsRouter);

  app.use(errorHandler);

  return app;
}
