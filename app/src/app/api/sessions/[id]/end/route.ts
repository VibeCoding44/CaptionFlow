import { NextResponse } from "next/server";

const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
    try {
        const resolvedParams = await Promise.resolve(params);
        const { id } = resolvedParams;

        if (!id) {
            return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
        }

        // Demo mode: skip all auth and Firestore operations
        if (isDemo) {
            console.log("[Demo] Skipping session end for:", id);
            return NextResponse.json({ success: true });
        }

        // 1. Authenticate the request
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { adminDb, adminAuth } = await import("@/lib/firebase-admin");

        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error) {
            console.error("Token verification failed:", error);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const uid = decodedToken.uid;

        // 3. Fetch the session to verify ownership
        const sessionRef = adminDb.collection("sessions").doc(id);
        const sessionSnap = await sessionRef.get();

        if (!sessionSnap.exists) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const sessionData = sessionSnap.data();
        const orgId = sessionData?.orgId;

        if (!orgId) {
            return NextResponse.json({ error: "Invalid session data" }, { status: 500 });
        }

        // 4. Authorize: Check if the user is a member of the session's organization
        const memberSnap = await adminDb
            .collection("organizationMembers")
            .where("orgId", "==", orgId)
            .where("userId", "==", uid)
            .limit(1)
            .get();

        if (memberSnap.empty) {
            return NextResponse.json({ error: "Forbidden: Not an organization member" }, { status: 403 });
        }

        // 5. Update the session
        await sessionRef.update({
            status: "completed",
            endTime: Date.now()
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error ending session via API:", error);
        return NextResponse.json(
            { error: "Failed to end session" },
            { status: 500 }
        );
    }
}
