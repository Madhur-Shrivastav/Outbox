import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./config/database.js";
import emailRoutes from "./routes/email.routes.js";
import leadRoutes from "./routes/lead.routes.js";
import senderRoutes from "./routes/sender.routes.js";
import authRoutes from "./routes/auth.routes.js";
import slackRoutes from "./routes/slack.routes.js";
import queueRoutes from "./routes/queue.routes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "ok",
      service: "reachinbox-api",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      status: "error",
      service: "reachinbox-api",
      database: "disconnected",
    });
  }
});

app.use("/api/emails", emailRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/senders", senderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/slack", slackRoutes);
app.use("/api/queues", queueRoutes);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled API error:", err);

    res.status(500).json({
      message: "Internal server error",
    });
  },
);

export default app;
