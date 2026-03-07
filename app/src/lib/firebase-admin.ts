import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";

let adminApp: ReturnType<typeof initializeApp> | null = null;
let adminAuth: ReturnType<typeof getAuth> | any = null;
let adminDb: ReturnType<typeof getFirestore> | any = null;

if (!isDemo) {
    adminApp =
        getApps().length === 0
            ? initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
                }),
            })
            : getApps()[0];

    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
}

export { adminApp, adminAuth, adminDb };
