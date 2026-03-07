import { NextResponse } from "next/server";

const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get("slug");
        const orgId = searchParams.get("orgId");

        if (!slug || !orgId) {
            return NextResponse.json(
                { error: "Missing required parameters `slug` or `orgId`" },
                { status: 400 }
            );
        }

        // Demo mode: skip Firestore check, just return the slug as-is
        if (isDemo) {
            return NextResponse.json({
                uniqueSlug: slug,
                available: true,
            });
        }

        const { adminDb } = await import("@/lib/firebase-admin");

        let isUnique = false;
        let counter = 0;
        let currentTestSlug = slug;
        let finalSlug = slug;

        while (!isUnique) {
            const orgSnapshot = await adminDb
                .collection("organizations")
                .where("slug", "==", currentTestSlug)
                .get();

            // It's unique if empty, OR if the only doc found is the current organization itself
            if (orgSnapshot.empty || (orgSnapshot.docs.length === 1 && orgSnapshot.docs[0].id === orgId)) {
                isUnique = true;
                finalSlug = currentTestSlug;
            } else {
                counter++;
                currentTestSlug = `${slug}-${counter}`;
            }
        }

        return NextResponse.json({
            uniqueSlug: finalSlug,
            available: true,
        });
    } catch (error) {
        console.error("Error validating organization slug:", error);
        return NextResponse.json(
            { error: "Failed to validate organization slug" },
            { status: 500 }
        );
    }
}
