import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function GET(request: Request) {
    console.log("Deepgram token route called!");
    // 1. Authenticate the request
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        console.error("Missing or invalid Authorization header");
        return NextResponse.json({ error: "Unauthorized: Missing header" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    try {
        await adminAuth.verifyIdToken(token);
        console.log("Token verified successfully");
    } catch (error) {
        console.error("Token verification failed:", error);
        return NextResponse.json({ error: `Unauthorized: ${error}` }, { status: 401 });
    }

    // 2. Return the Deepgram API key
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
        console.error("DEEPGRAM_API_KEY is not defined in the environment variables.");
        return NextResponse.json(
            { error: "Deepgram API key not configured" },
            { status: 500 }
        );
    }

    console.log("Returning Deepgram API key successfully");
    return NextResponse.json({ key: apiKey });
}
