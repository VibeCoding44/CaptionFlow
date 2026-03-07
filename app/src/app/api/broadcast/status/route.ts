import { NextRequest, NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";
import { getSessionChannel } from "@/lib/pusher-client";

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
