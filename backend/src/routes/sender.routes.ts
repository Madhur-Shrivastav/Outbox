import { Router } from "express";
import { prisma } from "../config/database.js";
import {
  requireAuth,
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
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

    let senders = await prisma.sender.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (
      senders.length === 0 &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
    ) {
      await prisma.sender.upsert({
        where: {
          userId_email: {
            userId: user.id,
            email: process.env.SMTP_USER,
          },
        },
        update: {
          displayName: "Outbox Default Sender",
          smtpHost: process.env.SMTP_HOST || "smtp.ethereal.email",
          smtpPort: Number(process.env.SMTP_PORT || 587),
          smtpUser: process.env.SMTP_USER,
          smtpPassword: process.env.SMTP_PASSWORD,
          isActive: true,
        },
        create: {
          userId: user.id,
          email: process.env.SMTP_USER,
          displayName: "Outbox Default Sender",
          smtpHost: process.env.SMTP_HOST || "smtp.ethereal.email",
          smtpPort: Number(process.env.SMTP_PORT || 587),
          smtpUser: process.env.SMTP_USER,
          smtpPassword: process.env.SMTP_PASSWORD,
          isActive: true,
        },
      });

      senders = await prisma.sender.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }

    return res.json({ senders });
  } catch (error) {
    console.error("Failed to fetch senders:", error);

    return res.status(500).json({
      message: "Failed to fetch senders",
    });
  }
});

router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { email, displayName, smtpHost, smtpPort, smtpUser, smtpPassword } =
      req.body;

    if (!email || !smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return res.status(400).json({
        message:
          "userId, email, smtpHost, smtpPort, smtpUser and smtpPassword are required",
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

    const sender = await prisma.sender.create({
      data: {
        userId: user.id,
        email,
        displayName,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPassword,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "Sender added successfully",
      sender,
    });
  } catch (error) {
    console.error("Failed to add sender:", error);

    return res.status(500).json({
      message: "Failed to add sender",
    });
  }
});

router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const sender = await prisma.sender.findFirst({
      where: {
        id: String(req.params.id),
        userId: user.id,
        isActive: true,
      },
    });

    if (!sender) {
      return res.status(404).json({
        message: "Sender not found",
      });
    }

    await prisma.sender.update({
      where: {
        id: sender.id,
      },
      data: {
        isActive: false,
      },
    });

    return res.json({
      message: "Sender disconnected successfully",
      senderId: sender.id,
    });
  } catch (error) {
    console.error("Failed to remove sender:", error);

    return res.status(500).json({
      message: "Failed to remove sender",
    });
  }
});

export default router;
