import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "node:fs";
import path from "node:path";

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  let serviceAccount: object;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    serviceAccount = JSON.parse(serviceAccountJson);
  } else {
    const serviceAccountPath = path.resolve(
      process.cwd(),
      "firebase-service-account.json",
    );

    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
  }

  return initializeApp({
    credential: cert(serviceAccount as any),
  });
}

const firebaseAdminApp = getFirebaseAdminApp();

export const firebaseAdminAuth = getAuth(firebaseAdminApp);
