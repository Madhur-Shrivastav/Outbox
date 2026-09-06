import "dotenv/config";
import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { prisma } from "../config/database.js";
import nodemailer from "nodemailer";
import { createTransporter } from "../integrations/email/smtp.js";
import { indexEmail } from "../integrations/elasticsearch/email.service.js";

const worker = new Worker(
  "email-queue",
  async (job) => {
    const { emailId } = job.data;

    console.log(`Processing email: ${emailId}`);

    const email = await prisma.email.findUnique({
      where: {
        id: emailId,
      },
    });

    const sender = await prisma.sender.findFirst({
      where: {
        userId: email?.userId,
        email: email?.senderEmail,
        isActive: true,
      },
    });

    if (!sender) {
      throw new Error(`Active sender ${email?.senderEmail} not found`);
    }

    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    const claim = await prisma.email.updateMany({
      where: {
        id: emailId,
        status: "SCHEDULED",
      },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
      },
    });

    if (claim.count === 0) {
      console.log(
        `Email ${emailId} is already being processed or was sent. Skipping.`,
      );
      return;
    }

    try {
      const senderTransporter = createTransporter(sender);
      const info = await senderTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email.recipient,
        subject: email.subject,
        text: email.body,
      });

      // Mark the email as successfully sent.
      await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: "SENT",
          sentAt: new Date(),
          messageId: info.messageId,
        },
      });

      await indexEmail({
        emailId: email.id,
        userId: email.userId,
        senderEmail: email.senderEmail,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: "SENT",
        scheduledAt: email.scheduledAt,
        sentAt: new Date(),
        createdAt: email.createdAt,
      });

      console.log(`Email ${emailId} sent successfully.`);
      console.log(`Message ID: ${info.messageId}`);

      const previewUrl = nodemailer.getTestMessageUrl(info);

      if (previewUrl) {
        console.log(`Ethereal preview: ${previewUrl}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await prisma.email.update({
        where: { id: emailId },
        data: {
          lastError: errorMessage,
          status:
            job.attemptsMade + 1 >= (job.opts.attempts ?? 1)
              ? "FAILED"
              : "SCHEDULED",
        },
      });

      console.error(`Email ${emailId} failed: ${errorMessage}`);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
  },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

console.log(
  `Email worker started with concurrency ${
    process.env.WORKER_CONCURRENCY || 5
  }`,
);
