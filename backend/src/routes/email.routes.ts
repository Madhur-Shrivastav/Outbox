import { Router } from "express";
import { prisma } from "../config/database.js";
import { emailQueue } from "../queues/email.queue.js";
import { getNextSenderSlot } from "../services/send-throttle.service.js";
import {
  requireAuth,
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();
const DEFAULT_SENDER_EMAIL = process.env.SMTP_USER;

// Schedule an email
router.post(
  "/schedule",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { recipient, subject, body, scheduledAt } = req.body;

      const senderEmail = req.body.senderEmail || DEFAULT_SENDER_EMAIL;

      if (!recipient || !subject || !body || !scheduledAt) {
        return res.status(400).json({
          message:
            "senderEmail, recipient, subject, body and scheduledAt are required",
        });
      }

      const firebaseUser = req.user!;

      const user = await prisma.user.findUnique({
        where: {
          firebaseUid: firebaseUser.uid,
        },
      });

      if (!user) {
        return res.status(401).json({
          message: "User account not found",
        });
      }

      const scheduledDate = new Date(scheduledAt);

      if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({
          message: "Invalid scheduledAt",
        });
      }

      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          message: "scheduledAt must be in the future",
        });
      }

      const sender = await prisma.sender.findFirst({
        where: {
          userId: user.id,
          email: senderEmail,
          isActive: true,
        },
      });

      if (!sender) {
        return res.status(400).json({
          message: "Sender is not connected to your account",
        });
      }

      const slot = await getNextSenderSlot(
        senderEmail,
        scheduledDate.getTime(),
      );

      const allowedAt = slot.allowedAt;

      const email = await prisma.email.create({
        data: {
          userId: user.id,
          senderEmail,
          recipient,
          subject,
          body,
          scheduledAt: new Date(allowedAt),
        },
      });

      if (slot.rateLimited) {
        const slackConnection = await prisma.slackConnection.findUnique({
          where: {
            userId: user.id,
          },
        });

        if (slackConnection) {
          try {
            const { sendSlackNotification } =
              await import("../integrations/slack/slack.service.js");

            await sendSlackNotification(
              slackConnection.webhookUrl,
              `⚠️ Outbox rate limit reached for ${senderEmail}. ` +
                `The email to ${recipient} has been delayed until ` +
                `${new Date(allowedAt).toLocaleString()}.`,
            );
          } catch (error) {
            console.error("Failed to send Slack notification:", error);
          }
        }
      }

      const delay = Math.max(allowedAt - Date.now(), 0);

      const job = await emailQueue.add(
        "send-email",
        {
          emailId: email.id,
        },
        {
          jobId: `email-${email.id}`,
          delay,
        },
      );

      await prisma.email.update({
        where: {
          id: email.id,
        },
        data: {
          bullJobId: job.id,
        },
      });

      return res.status(201).json({
        message: "Email scheduled successfully",
        email,
        jobId: job.id,
      });
    } catch (error) {
      console.error("Failed to schedule email:", error);

      return res.status(500).json({
        message: "Failed to schedule email",
      });
    }
  },
);

router.get(
  "/scheduled",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const firebaseUser = req.user!;

      const user = await prisma.user.findUnique({
        where: {
          firebaseUid: firebaseUser.uid,
        },
      });

      if (!user) {
        return res.status(401).json({
          message: "User account not found",
        });
      }

      const emails = await prisma.email.findMany({
        where: {
          userId: user.id,
          status: {
            in: ["SCHEDULED", "PROCESSING"],
          },
        },
        orderBy: {
          scheduledAt: "asc",
        },
      });

      return res.json({
        emails,
      });
    } catch (error) {
      console.error("Failed to fetch scheduled emails:", error);

      return res.status(500).json({
        message: "Failed to fetch scheduled emails",
      });
    }
  },
);

router.get("/sent", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const firebaseUser = req.user!;

    const user = await prisma.user.findUnique({
      where: {
        firebaseUid: firebaseUser.uid,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "User account not found",
      });
    }

    const emails = await prisma.email.findMany({
      where: {
        userId: user.id,
        status: "SENT",
      },
      orderBy: {
        sentAt: "desc",
      },
    });

    return res.json({
      emails,
    });
  } catch (error) {
    console.error("Failed to fetch sent emails:", error);

    return res.status(500).json({
      message: "Failed to fetch sent emails",
    });
  }
});

router.post(
  "/schedule-bulk",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        recipients,
        subject,
        body,
        scheduledAt,
        delayBetweenEmails,
        hourlyLimit,
      } = req.body;

      const senderEmail = req.body.senderEmail || DEFAULT_SENDER_EMAIL;

      if (
        !Array.isArray(recipients) ||
        recipients.length === 0 ||
        !subject ||
        !body ||
        !scheduledAt
      ) {
        return res.status(400).json({
          message: "Missing required scheduling fields",
        });
      }

      const firebaseUser = req.user!;

      const user = await prisma.user.findUnique({
        where: {
          firebaseUid: firebaseUser.uid,
        },
      });

      if (!user) {
        return res.status(401).json({
          message: "User account not found",
        });
      }

      const sender = await prisma.sender.findFirst({
        where: {
          userId: user.id,
          email: senderEmail,
          isActive: true,
        },
      });

      if (!sender) {
        return res.status(400).json({
          message: "Sender is not connected to your account",
        });
      }

      const parsedDelay = Number(delayBetweenEmails);
      const parsedHourlyLimit = Number(hourlyLimit);

      const minSendDelayMs =
        Number.isFinite(parsedDelay) && parsedDelay >= 0
          ? parsedDelay * 1000
          : Number(process.env.MIN_SEND_DELAY_MS || 2000);

      const sendHourlyLimit =
        Number.isFinite(parsedHourlyLimit) && parsedHourlyLimit > 0
          ? parsedHourlyLimit
          : Number(process.env.HOURLY_SEND_LIMIT || 200);

      if (minSendDelayMs > 3600000) {
        return res.status(400).json({
          message: "Delay cannot exceed 1 hour",
        });
      }

      if (sendHourlyLimit > 10000) {
        return res.status(400).json({
          message: "Hourly limit is too high",
        });
      }

      const requestedAt = new Date(scheduledAt).getTime();

      if (!Number.isFinite(requestedAt)) {
        return res.status(400).json({
          message: "Invalid scheduled time",
        });
      }

      const createdEmails = [];

      for (const recipient of recipients) {
        const cleanRecipient = String(recipient).trim();

        if (!cleanRecipient || !cleanRecipient.includes("@")) {
          continue;
        }

        const slot = await getNextSenderSlot(
          sender.email,
          requestedAt,
          minSendDelayMs,
          sendHourlyLimit,
        );

        const email = await prisma.email.create({
          data: {
            userId: user.id,
            senderEmail: sender.email,
            recipient: cleanRecipient,
            subject: String(subject),
            body: String(body),
            scheduledAt: new Date(slot.allowedAt),
          },
        });

        const delay = Math.max(slot.allowedAt - Date.now(), 0);

        const job = await emailQueue.add(
          "send-email",
          {
            emailId: email.id,
          },
          {
            jobId: `email-${email.id}`,
            delay,
          },
        );

        await prisma.email.update({
          where: {
            id: email.id,
          },
          data: {
            bullJobId: job.id,
          },
        });

        createdEmails.push(email.id);
      }

      return res.status(201).json({
        message: "Emails scheduled successfully",
        count: createdEmails.length,
        emailIds: createdEmails,
      });
    } catch (error) {
      console.error("Bulk scheduling failed:", error);

      return res.status(500).json({
        message: "Failed to schedule emails",
      });
    }
  },
);

router.get("/:id", async (req, res) => {
  try {
    const email = await prisma.email.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!email) {
      return res.status(404).json({
        message: "Email not found",
      });
    }

    return res.json({
      email,
    });
  } catch (error) {
    console.error("Failed to fetch email:", error);

    return res.status(500).json({
      message: "Failed to fetch email",
    });
  }
});

export default router;
