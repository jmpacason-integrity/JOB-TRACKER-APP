import express from "express";
import cors from "cors";
import path from "path";
import { UPLOAD_DIR } from "./middleware/upload";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { jobsRouter } from "./routes/jobs";
import { scheduleRouter } from "./routes/schedule";
import { timeEntriesRouter } from "./routes/timeEntries";
import { expensesRouter } from "./routes/expenses";
import { photosRouter } from "./routes/photos";
import { purchaseOrdersRouter } from "./routes/purchaseOrders";
import { budgetsRouter } from "./routes/budgets";
import { weatherRouter } from "./routes/weather";
import { pushTokensRouter } from "./routes/pushTokens";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(UPLOAD_DIR)));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/jobs", jobsRouter);
app.use("/schedule", scheduleRouter);
app.use("/time-entries", timeEntriesRouter);
app.use("/expenses", expensesRouter);
app.use("/photos", photosRouter);
app.use("/purchase-orders", purchaseOrdersRouter);
app.use("/budgets", budgetsRouter);
app.use("/weather", weatherRouter);
app.use("/push-tokens", pushTokensRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});
