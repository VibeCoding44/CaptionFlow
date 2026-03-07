import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (!isDemo) {
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    // Initialize Firebase (prevent duplicate initialization)
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
}

// These exports will be null in demo mode — callers should never
// reach Firebase code paths when NEXT_PUBLIC_APP_MODE === "demo"
export { app, auth, db };
