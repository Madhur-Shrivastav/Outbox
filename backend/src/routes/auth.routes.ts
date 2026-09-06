import { Router } from "express";
import { prisma } from "../config/database.js";
import {
  requireAuth,
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const firebaseUser = req.user!;

    const user = await prisma.user.upsert({
      where: {
        firebaseUid: firebaseUser.uid,
      },
      update: {
        email: firebaseUser.email,
        name: firebaseUser.name || null,
        avatarUrl: firebaseUser.picture || null,
      },
      create: {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.name || null,
        avatarUrl: firebaseUser.picture || null,
      },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    console.error("Failed to sync user:", error);

    return res.status(500).json({
      message: "Failed to sync user",
    });
  }
});

router.get("/search", requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.json({
        emails: [],
      });
    }

    const { elasticsearchClient, EMAIL_INDEX } =
      await import("../integrations/elasticsearch/client.js");

    const result = await elasticsearchClient.search({
      index: EMAIL_INDEX,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: q,
                fields: ["subject^3", "body", "recipient", "senderEmail"],
              },
            },
          ],
          filter: [
            {
              term: {
                userId: user.id,
              },
            },
          ],
        },
      },
    });

    const emails = result.hits.hits.map((hit) => hit._source);

    return res.json({
      emails,
    });
  } catch (error) {
    console.error("Email search failed:", error);

    return res.status(500).json({
      message: "Email search failed",
    });
  }
});

export default router;
