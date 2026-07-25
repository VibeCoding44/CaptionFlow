import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import { verifyRequestAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const TOKEN_TTL_SECONDS = 30; // Short-lived: the WebSocket connects immediately

/**
 * Mint a short-lived Deepgram access token (never expose the master key).
 * The browser opens the Deepgram WebSocket with ["bearer", token].
 */
async function mintDeepgramToken(): Promise<
    { ok: true; token: string; expiresIn: number } | { ok: false; status: number; error: string }
> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
        console.error("DEEPGRAM_API_KEY is not defined in the environment variables.");
        return { ok: false, status: 500, error: "Deepgram API key not configured" };
    }

    try {
        const deepgram = createClient(apiKey);
        const { result, error } = await deepgram.auth.grantToken({ ttl_seconds: TOKEN_TTL_SECONDS });
        if (error || !result?.access_token) {
            console.error("Failed to mint Deepgram grant token:", error);
            return { ok: false, status: 502, error: "Failed to mint Deepgram token" };
        }
        return { ok: true, token: result.access_token, expiresIn: result.expires_in };
    } catch (err) {
        console.error("Error minting Deepgram grant token:", err);
        return { ok: false, status: 502, error: "Failed to mint Deepgram token" };
    }
}

export async function GET(request: Request) {
    const auth = await verifyRequestAuth(request);
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const minted = await mintDeepgramToken();
    if (!minted.ok) {
        return NextResponse.json({ error: minted.error }, { status: minted.status });
    }

    // `token` is the short-lived access token. `key` is kept as an alias for
    // backwards-compat with any client still reading the old field — it now
    // also holds the short-lived token, never the master API key.
    return NextResponse.json({ token: minted.token, key: minted.token, expiresIn: minted.expiresIn });
}
