import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";

/**
 * GET /api/sessions/[id]/info
 *
 * Public, non-sensitive display metadata for the audience viewer so the
 * language picker can populate the moment someone joins, instead of waiting
 * for the first caption broadcast. Returns only fields the audience already
 * sees (name, languages, status); never org or creator data.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    if (isDemo) {
        return NextResponse.json({
            name: "Demo Session",
            sourceLanguage: "en",
            targetLanguages: ["es", "fr"],
            status: "live",
        });
    }

    try {
        const { adminDb } = await import("@/lib/firebase-admin");
        const snap = await adminDb.collection("sessions").doc(id).get();

        if (!snap.exists) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const session = snap.data();
        return NextResponse.json({
            name: session?.name ?? "",
            sourceLanguage: session?.sourceLanguage ?? "en",
            targetLanguages: Array.isArray(session?.targetLanguages) ? session.targetLanguages : [],
            status: session?.status ?? "live",
        });
    } catch (error) {
        console.error("Session info error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
