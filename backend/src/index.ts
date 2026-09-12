import "dotenv/config";
import { app } from "./app";
import { runAllReminderChecks } from "./jobs/reminders";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`Job Tracker API listening on port ${PORT}`);
});

const REMINDER_INTERVAL_MS = 15 * 60 * 1000;
setInterval(() => {
  runAllReminderChecks().catch((err) => console.error("Reminder check failed", err));
}, REMINDER_INTERVAL_MS);
