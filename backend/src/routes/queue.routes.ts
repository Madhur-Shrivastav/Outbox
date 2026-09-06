import { Router } from "express";
import { Queue } from "bullmq";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { redisConnection } from "../config/redis.js";

const router = Router();

const emailQueue = new Queue("email-queue", {
  connection: redisConnection,
});

const serverAdapter = new ExpressAdapter();

serverAdapter.setBasePath("/api/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

router.use("/", serverAdapter.getRouter());

export default router;
