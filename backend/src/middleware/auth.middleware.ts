import { Request, Response, NextFunction } from "express";
import { firebaseAdminAuth } from "../integrations/firebase/firebase-admin.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication token required",
      });
    }

    const idToken = authHeader.substring(7);

    const decodedToken = await firebaseAdminAuth.verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      name: decodedToken.name,
      picture: decodedToken.picture,
    };

    next();
  } catch (error) {
    console.error("Authentication failed:", error);

    return res.status(401).json({
      message: "Invalid or expired authentication token",
    });
  }
}
