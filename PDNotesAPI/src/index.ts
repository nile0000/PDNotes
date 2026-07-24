import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

// Bind to 0.0.0.0 so the Android emulator (via 10.0.2.2) can reach this server.
app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`PD Notes API listening on http://0.0.0.0:${env.PORT}`);
});
