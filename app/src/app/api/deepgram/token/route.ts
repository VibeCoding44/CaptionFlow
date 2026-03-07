import { NextResponse } from "next/server";
import { checkDemoRateLimit } from "@/lib/rate-limit";

const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";
const DEMO_TOKEN_LIMIT = 5; // Max 5 token requests per IP per day

export async function GET(request: Request) {
    // ── Demo Mode: Rate limit + skip Firebase auth ──────────
    if (isDemo) {
        const ip = request.headers.get("x-forwarded-for") || "unknown";
        const { allowed, remaining } = checkDemoRateLimit(ip, DEMO_TOKEN_LIMIT);

        if (!allowed) {
            return NextResponse.json(
                { error: "Demo limit reached (5 sessions/day). Sign up for full access!" },
                { status: 429 }
            );
        }
        console.log(`[Demo] Token request from ${ip} — ${remaining} remaining`);

        // In demo mode, skip Firebase auth and go straight to returning the key
        const apiKey = process.env.DEEPGRAM_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Deepgram API key not configured" },
                { status: 500 }
            );
        }
        return NextResponse.json({ key: apiKey });
    }
    // ───────────────────────────────────────────────────────

    // Production: Authenticate via Firebase Admin
    const { adminAuth } = await import("@/lib/firebase-admin");

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        console.error("Missing or invalid Authorization header");
        return NextResponse.json({ error: "Unauthorized: Missing header" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    try {
        await adminAuth.verifyIdToken(token);
    } catch (error) {
        console.error("Token verification failed:", error);
        return NextResponse.json({ error: `Unauthorized: ${error}` }, { status: 401 });
    }

    // Return the Deepgram API key
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
        console.error("DEEPGRAM_API_KEY is not defined in the environment variables.");
        return NextResponse.json(
            { error: "Deepgram API key not configured" },
            { status: 500 }
        );
    }

    return NextResponse.json({ key: apiKey });
}
