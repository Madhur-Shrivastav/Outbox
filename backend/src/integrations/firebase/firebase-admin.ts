import "dotenv/config";
import fs from "fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const serviceAccountPath = "firebase-service-account.json";

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Firebase service account not found: ${serviceAccountPath}`);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

const firebaseApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
      });

export const firebaseAdminAuth = getAuth(firebaseApp);
