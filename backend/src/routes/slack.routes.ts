import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../config/database.js";
import {
  requireAuth,
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

const STATE_TTL_SECONDS = 600;

function getSlackAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: "incoming-webhook",
    redirect_uri: process.env.SLACK_REDIRECT_URI!,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

router.get("/connect", requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const state = crypto.randomBytes(32).toString("hex");

    const redis = (await import("../config/redis.js")).redisConnection;

    await redis.set(
      `slack:oauth:state:${state}`,
      user.id,
      "EX",
      STATE_TTL_SECONDS,
    );

    return res.json({
      url: getSlackAuthorizeUrl(state),
    });
  } catch (error) {
    console.error("Slack connect failed:", error);

    return res.status(500).json({
      message: "Failed to start Slack OAuth",
    });
  }
});

router.get("/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");

    if (!code || !state) {
      return res.status(400).send("Missing Slack OAuth parameters");
    }

    const redis = (await import("../config/redis.js")).redisConnection;

    const userId = await redis.get(`slack:oauth:state:${state}`);

    if (!userId) {
      return res.status(400).send("Invalid or expired OAuth state");
    }

    await redis.del(`slack:oauth:state:${state}`);

    const credentials = Buffer.from(
      `${process.env.SLACK_CLIENT_ID}:${process.env.SLACK_CLIENT_SECRET}`,
    ).toString("base64");

    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        redirect_uri: process.env.SLACK_REDIRECT_URI!,
      }),
    });

    const data = (await tokenResponse.json()) as {
      ok: boolean;
      error?: string;
      team?: {
        id?: string;
        name?: string;
      };
      incoming_webhook?: {
        url?: string;
        channel?: string;
        channel_id?: string;
      };
    };

    if (!data.ok || !data.incoming_webhook?.url) {
      console.error("Slack OAuth response:", data);

      return res
        .status(400)
        .send(`Slack OAuth failed: ${data.error || "missing webhook"}`);
    }

    await prisma.slackConnection.upsert({
      where: {
        userId,
      },
      update: {
        teamId: data.team?.id || "",
        teamName: data.team?.name || null,
        channelId: data.incoming_webhook.channel_id || null,
        channelName: data.incoming_webhook.channel || null,
        webhookUrl: data.incoming_webhook.url,
      },
      create: {
        userId,
        teamId: data.team?.id || "",
        teamName: data.team?.name || null,
        channelId: data.incoming_webhook.channel_id || null,
        channelName: data.incoming_webhook.channel || null,
        webhookUrl: data.incoming_webhook.url,
      },
    });

    return res.redirect(`${process.env.FRONTEND_URL}/?slack=connected`);
  } catch (error) {
    console.error("Slack OAuth callback failed:", error);

    return res.status(500).send("Slack OAuth failed");
  }
});

router.get("/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  const firebaseUser = req.user!;

  const user = await prisma.user.findUnique({
    where: {
      firebaseUid: firebaseUser.uid,
    },
    include: {
      slackConnection: true,
    },
  });

  if (!user) {
    return res.status(401).json({
      message: "User account not found",
    });
  }

  return res.json({
    connected: Boolean(user.slackConnection),
    workspace: user.slackConnection?.teamName || null,
    channel: user.slackConnection?.channelName || null,
  });
});

router.delete(
  "/disconnect",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
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

    await prisma.slackConnection.deleteMany({
      where: {
        userId: user.id,
      },
    });

    return res.json({
      message: "Slack disconnected successfully",
    });
  },
);

export default router;
