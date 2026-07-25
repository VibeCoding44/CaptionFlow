import { NextRequest, NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";
import { getSessionChannel } from "@/lib/pusher-client";
import { verifyRequestAuth, userCanBroadcast } from "@/lib/auth-helpers";

const ALLOWED_STATUSES = new Set(["scheduled", "live", "completed"]);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sessionId, status } = body;

        if (!sessionId || !status) {
            return NextResponse.json(
                { error: "Missing sessionId or status" },
                { status: 400 }
            );
        }

        if (!ALLOWED_STATUSES.has(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        // Only the session's operator may broadcast status changes — session IDs
        // are public (they're in the audience join URL / QR code).
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

        const pusher = getPusherServer();
        const channel = getSessionChannel(sessionId);

        await pusher.trigger(channel, "status-update", { status });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Status broadcast error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
