import { NextRequest, NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";
import { getSessionChannel, CAPTION_EVENT } from "@/lib/pusher-client";
import { adminDb } from "@/lib/firebase-admin";

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

        // Build translations map
        const translations: Record<string, string> = {};

        if (targetLanguages && targetLanguages.length > 0) {
            // Translate to all target languages concurrently
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
        if (isFinal) {
            try {
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
