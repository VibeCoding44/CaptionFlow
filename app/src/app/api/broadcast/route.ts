import { NextRequest, NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";
import { getSessionChannel, CAPTION_EVENT } from "@/lib/pusher-client";
import { checkDemoRateLimit } from "@/lib/rate-limit";
import { getClientIp, verifyRequestAuth, userCanBroadcast } from "@/lib/auth-helpers";

const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";
const DEMO_BROADCAST_LIMIT = 50; // Max 50 broadcast calls per IP per day

// Google Cloud Translation — use the simpler v2 basic API
import { v2 } from "@google-cloud/translate";

const translateClient = new v2.Translate({
    projectId: process.env.FIREBASE_PROJECT_ID,
    credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
});

interface BroadcastRequest {
    sessionId: string;
    text: string;
    sourceLanguage: string;
    targetLanguages: string[];
    isFinal: boolean;
}

/**
 * POST /api/broadcast
 *
 * Receives transcript text from the browser, translates it into each
 * target language using Google Cloud Translation v2, then broadcasts the
 * original + translations via Pusher to all connected viewer displays.
 */
export async function POST(req: NextRequest) {
    try {
        const body: BroadcastRequest = await req.json();
        const { sessionId, text, sourceLanguage, targetLanguages, isFinal } = body;

        if (!sessionId || !text) {
            return NextResponse.json(
                { error: "Missing sessionId or text" },
                { status: 400 }
            );
        }

        // ── Authorization ──────────────────────────────────
        if (isDemo) {
            // Demo: no auth, but rate-limit by client IP.
            const ip = getClientIp(req);
            const { allowed } = checkDemoRateLimit(ip, DEMO_BROADCAST_LIMIT);
            if (!allowed) {
                return NextResponse.json(
                    { error: "Demo limit reached. Sign up for full access!" },
                    { status: 429 }
                );
            }
        } else {
            // Production: require a valid Firebase ID token AND that the caller
            // is allowed to broadcast into this session (creator or org member).
            const auth = await verifyRequestAuth(req);
            if (!auth) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            const allowed = await userCanBroadcast(auth.uid, sessionId);
            if (!allowed) {
                return NextResponse.json(
                    { error: "Forbidden: not authorized for this session" },
                    { status: 403 }
                );
            }
        }
        // ─────────────────────────────────────────────────────

        // Build translations map.
        // Only translate FINAL transcripts — interim results change rapidly and
        // would multiply paid Google Translate calls for text that's about to be
        // replaced. Interim broadcasts carry the source text with no translations.
        const translations: Record<string, string> = {};

        if (isFinal && targetLanguages && targetLanguages.length > 0) {
            const translationPromises = targetLanguages.map(async (lang) => {
                try {
                    const [translated] = await translateClient.translate(text, {
                        from: sourceLanguage,
                        to: lang,
                    });
                    translations[lang] = translated;
                } catch (err) {
                    console.error(`Translation to ${lang} failed:`, err);
                    translations[lang] = text; // Fallback to original
                }
            });

            await Promise.all(translationPromises);
        }

        // Broadcast via Pusher
        const pusher = getPusherServer();
        const channel = getSessionChannel(sessionId);

        const timestamp = Date.now();

        await pusher.trigger(channel, CAPTION_EVENT, {
            text,
            sourceLanguage,
            translations,
            isFinal,
            timestamp,
        });

        // Save final transcripts with translations to Firestore
        if (isFinal && !isDemo) {
            try {
                // Dynamic import — only loaded when actually saving to Firestore
                const { adminDb } = await import("@/lib/firebase-admin");
                const transcriptsRef = adminDb.collection(`sessions/${sessionId}/transcripts`);
                await transcriptsRef.add({
                    sessionId,
                    text,
                    translations,
                    timestamp,
                });
            } catch (saveErr) {
                console.error("Error saving transcript to Firestore:", saveErr);
                // Don't fail the request — broadcast already succeeded
            }
        }

        return NextResponse.json({ success: true, translations });
    } catch (error) {
        console.error("Broadcast error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
